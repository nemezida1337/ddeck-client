package ai.dshm.client.app

import ai.dshm.client.MobileClient
import ai.dshm.client.Protocol
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.http.SslError
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.SslErrorHandler
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import java.security.cert.X509Certificate

/**
 * The mobile interface itself: the computer's DSH page, adapted for the phone by
 * the plugin, inside a WebView.
 *
 * Two things make it work:
 * - the session credential from pairing is installed as the gateway's cookie, so
 *   the page loads authenticated without a launch token;
 * - a self-signed certificate from the computer is accepted only when it matches
 *   the pinned one. Verification is never disabled wholesale: a certificate that
 *   does not match produces the standard error page.
 */
class SessionActivity : Activity() {
  private lateinit var webView: WebView
  private lateinit var loadingOverlay: android.view.View
  private var session: String? = null
  private var csrf: String? = null
  private var origin: String = ""

  /** Last observed "a turn is running" state, sampled while the screen is visible. */
  /**
   * Pending file chooser, or null when none is open.
   *
   * A WebView hands the page's `input[type=file]` to the application and waits for
   * exactly one answer: the chosen files, or null when the person backed out. Forgetting
   * either case leaves the page's attachment control dead for the rest of the session,
   * so the callback is stored here and always resolved.
   */
  private var pendingFileChooser: android.webkit.ValueCallback<Array<android.net.Uri>>? = null

  /** Callback predictive back (Android 13+); null на старых версиях. */
  private var backCallback: android.window.OnBackInvokedCallback? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val origin = intent.getStringExtra(EXTRA_ORIGIN) ?: run { finish(); return }
    this.origin = origin
    val sessionExtra = intent.getStringExtra(EXTRA_SESSION) ?: run { finish(); return }
    val csrf = intent.getStringExtra(EXTRA_CSRF)
    session = sessionExtra
    this.csrf = csrf
    val pinned = parseCertificate(intent.getStringExtra(EXTRA_CA))

    webView = WebView(this).apply {
      setBackgroundColor(Color.parseColor("#12151C"))
      settings.javaScriptEnabled = true
      settings.domStorageEnabled = true
      settings.cacheMode = WebSettings.LOAD_DEFAULT
      settings.mediaPlaybackRequiresUserGesture = false
      settings.javaScriptCanOpenWindowsAutomatically = true
      settings.setSupportMultipleWindows(false)
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }
    // Downloads: the interface exports a session as a ZIP through an ordinary
    // `<a download href="…/api/session.export">`. A WebView with no download listener
    // swallows that click without a word — verified on the phone: the menu item did
    // nothing and no file appeared.
    //
    // The platform downloader cannot be used here even with a listener: the gateway's
    // certificate is signed by the pairing CA, which only this application trusts, so
    // `DownloadManager` fails the handshake (measured on the device:
    // `ssl_verify_result=20`, i.e. "issuer not found"). The bytes therefore come
    // through the same pinned client that reads the interface, and are written to the
    // public Downloads collection.
    webView.setDownloadListener { url, _, contentDisposition, mimeType, _ ->
      val fileName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType)
      val client = MobileClient(origin, pinned)
      session?.let { client.adoptSession(it, csrf) }
      downloadInBackground(client, url, fileName, mimeType)
    }

    // A chat interface asks questions: without a WebChromeClient, alert/confirm
    // silently do nothing and the page looks frozen, and console output is lost.
    webView.webChromeClient = object : android.webkit.WebChromeClient() {
      override fun onConsoleMessage(message: android.webkit.ConsoleMessage): Boolean {
        android.util.Log.i("dshm-js", "${message.message()} (${message.sourceId()}:${message.lineNumber()})")
        return true
      }

      /**
       * Open the system file picker for the page.
       *
       * The mobile interface offers "add a file" in its composer; in a WebView that
       * request arrives here and nowhere else. Returning false — what a WebView does
       * by default — makes the control look broken rather than disabled, because the
       * page has no way to know the shell declined.
       */
      override fun onShowFileChooser(
        view: WebView,
        filePathCallback: android.webkit.ValueCallback<Array<android.net.Uri>>,
        fileChooserParams: FileChooserParams,
      ): Boolean {
        // A second request while one is open would strand the first callback.
        pendingFileChooser?.onReceiveValue(null)
        pendingFileChooser = filePathCallback
        val content = Intent(Intent.ACTION_GET_CONTENT).apply {
          addCategory(Intent.CATEGORY_OPENABLE)
          // The page says what it accepts; "*/*" is the common case and must be
          // translated into something a picker understands.
          type = fileChooserParams.acceptTypes
            .firstOrNull { it.isNotBlank() && it != "*/*" }
            ?.substringBefore(';')
            ?: "*/*"
          putExtra(Intent.EXTRA_ALLOW_MULTIPLE, fileChooserParams.mode == FileChooserParams.MODE_OPEN_MULTIPLE)
        }
        return runCatching {
          startActivityForResult(
            Intent.createChooser(content, getString(R.string.session_file_chooser_title)),
            REQUEST_FILE_CHOOSER,
          )
          true
        }.getOrElse { failure ->
          android.util.Log.w("dshm", "no file picker available: ${failure.message}")
          pendingFileChooser = null
          filePathCallback.onReceiveValue(null)
          false
        }
      }

      override fun onJsAlert(view: WebView, url: String, text: String, result: android.webkit.JsResult): Boolean {
        android.app.AlertDialog.Builder(this@SessionActivity)
          .setMessage(text)
          .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm() }
          .setOnCancelListener { result.cancel() }
          .show()
        return true
      }

      override fun onJsConfirm(view: WebView, url: String, text: String, result: android.webkit.JsResult): Boolean {
        android.app.AlertDialog.Builder(this@SessionActivity)
          .setMessage(text)
          .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm() }
          .setNegativeButton(android.R.string.cancel) { _, _ -> result.cancel() }
          .setOnCancelListener { result.cancel() }
          .show()
        return true
      }
    }
    loadingOverlay = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#12151C"))
      addView(ProgressBar(this@SessionActivity))
      addView(TextView(this@SessionActivity).apply {
        text = getString(R.string.session_loading)
        gravity = Gravity.CENTER
        setTextColor(Color.parseColor("#A7ABB5"))
        textSize = 14f
        setPadding(0, 16, 0, 0)
      }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { gravity = Gravity.CENTER_HORIZONTAL })
    }
    val root = FrameLayout(this).apply {
      setBackgroundColor(Color.parseColor("#12151C"))
      addView(webView)
      addView(loadingOverlay, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    }
    androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
      // Two different insets, two different owners.
      //
      // The page is served with `viewport-fit=cover` and lays its own header out with
      // `env(safe-area-inset-*)`, so the system bars are already its business. Padding
      // this view by them as well applied the status bar twice — measured on the
      // phone: 41 px natively plus 41 px inside the page, an 82 px empty band above
      // the first line of text that no page-side CSS could recover.
      //
      // The keyboard is the opposite case: it is not a safe-area inset, so the page
      // cannot know about it and the shell must reserve the space. Without this the
      // send button sat 140 px below the last visible row.
      val ime = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime())
      view.setPadding(0, 0, 0, ime.bottom)
      insets
    }
    setContentView(root)
    webView.postDelayed({ loadingOverlay.visibility = android.view.View.GONE }, 5_000)

    android.util.Log.i("dshm", "session open: origin=$origin session=${sessionExtra.length} chars csrf=${csrf != null}")
    // The page reads window.__DSH_MOBILE_NATIVE__ for notifications; the shim
    // installed after load forwards its two calls here.
    webView.addJavascriptInterface(NativeBridge(applicationContext, webView), "__dshmNative")
    // Спрашиваем разрешение один раз за установку: повторный системный диалог при
    // каждом запуске раздражает, а отказ не должен блокировать чат. Если человек
    // передумает, подсказка мобильного слоя ведёт в настройки уведомлений.
    if (android.os.Build.VERSION.SDK_INT >= 33 &&
      checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED
    ) {
      val preferences = getSharedPreferences("ddeck", MODE_PRIVATE)
      if (!preferences.getBoolean("notificationAsked", false)) {
        preferences.edit().putBoolean("notificationAsked", true).apply()
        requestPermissions(arrayOf("android.permission.POST_NOTIFICATIONS"), 1)
      }
    }
    webView.webViewClient = PinnedWebViewClient(origin, pinned)
    // Loading before the cookie store commits yields a page request without the
    // session, which the gateway answers as unauthenticated. Commit first, load
    // from the callback.
    installCookies(origin, sessionExtra, csrf) { webView.loadUrl("$origin/") }
  }

  /**
   * Fetch one download through the pinned client and publish it to Downloads.
   *
   * Runs off the main thread: the response is a ZIP of a whole conversation, and the
   * system would otherwise show an application that stopped responding for the length
   * of the transfer.
   *
   * @param client paired client for this gateway.
   * @param url absolute URL the page asked for.
   * @param fileName name to publish under.
   * @param mimeType type reported by the page.
   */
  private fun downloadInBackground(client: MobileClient, url: String, fileName: String, mimeType: String?) {
    val path = url.removePrefix(origin.trimEnd('/'))
    Thread {
      val published = runCatching {
        val resolver = applicationContext.contentResolver
        val values = android.content.ContentValues().apply {
          put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName)
          put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mimeType ?: "application/octet-stream")
          put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS)
        }
        val target = resolver.insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
          ?: error("Downloads collection refused the entry")
        try {
          resolver.openOutputStream(target)?.use { sink -> client.downloadTo(path, sink) }
            ?: error("Downloads collection gave no stream")
        } catch (failure: Throwable) {
          // A half-written entry would show up as a corrupt file in the person's
          // Downloads, so a failed transfer removes its own placeholder.
          resolver.delete(target, null, null)
          throw failure
        }
        target
      }
      runOnUiThread {
        published.fold(
          onSuccess = { uri ->
            android.util.Log.i("dshm", "download saved: $fileName")
            notifyDownloadSaved(fileName, uri)
          },
          onFailure = { failure ->
            android.util.Log.w("dshm", "download failed: ${failure.message}")
            android.widget.Toast.makeText(
              this,
              getString(
                R.string.session_download_failed,
                failure.message ?: getString(R.string.session_download_unknown_error),
              ),
              android.widget.Toast.LENGTH_LONG,
            ).show()
          },
        )
      }
    }.start()
  }

  /**
   * Tell the person where the file went.
   *
   * A download with no feedback is indistinguishable from one that did nothing, which
   * is exactly the state this code replaced.
   *
   * @param fileName published name.
   * @param uri location in the Downloads collection.
   */
  private fun notifyDownloadSaved(fileName: String, uri: android.net.Uri) {
    val manager = getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
    Notifications.ensureFileChannel(this)
    val open = android.app.PendingIntent.getActivity(
      this,
      0,
      Intent(android.app.DownloadManager.ACTION_VIEW_DOWNLOADS),
      android.app.PendingIntent.FLAG_IMMUTABLE,
    )
    val notification = Notifications.base(
      this,
      Notifications.CHANNEL_FILES,
      getString(R.string.download_saved_title),
      fileName,
    )
      .setContentIntent(open)
      .setAutoCancel(true)
      .build()
    if (manager.areNotificationsEnabled()) manager.notify(fileName, Notifications.ID_FILE, notification)
  }

  /**
   * Keep the process alive while the session is in the background.
   *
   * The reason is measured, not assumed: a backgrounded application is frozen, and a
   * frozen process runs nothing — no timers, no DOM observer. A page timer collected
   * about half its ticks across a window that was half background, and the computer
   * side's question watcher never called the notification bridge at all while the screen
   * was hidden. Task completion still arrived, because its event comes over the network
   * before the freeze; a question raised after it was simply lost.
   *
   * Deciding *whether* to notify still belongs to the page — the shell only removes the
   * platform obstacle. The check is deliberately not "is a turn running": the interface
   * exposes that state only while it is running (`aria-busy` is unset, the stop button
   * exists only during a turn), and reading it from a backgrounded page is exactly the
   * moment it cannot be read. Keeping the session alive for as long as the person keeps
   * it open is predictable, and the ongoing notification says what it is for.
   */
  override fun onStart() {
    super.onStart()
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU && backCallback == null) {
      val callback = android.window.OnBackInvokedCallback { dispatchNativeBack() }
      backCallback = callback
      onBackInvokedDispatcher.registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback)
    }
    SessionKeepAliveService.stop(this)
  }

  override fun onStop() {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
      backCallback?.let { onBackInvokedDispatcher.unregisterOnBackInvokedCallback(it) }
    }
    backCallback = null
    super.onStop()
    // Запускать FGS только когда экран уходит в фон, а не когда activity
    // завершается (выход/переход по уведомлению): иначе stop() из onDestroy
    // обгоняет startForeground() и Android убивает процесс с
    // ForegroundServiceDidNotStartInTimeException.
    if (!isFinishing) SessionKeepAliveService.start(this)
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_FILE_CHOOSER) {
      super.onActivityResult(requestCode, resultCode, data)
      return
    }
    val callback = pendingFileChooser
    pendingFileChooser = null
    if (callback == null) return
    // Null means "the person backed out": the page needs that answer too, otherwise
    // its attachment control stays disabled forever.
    val chosen = if (resultCode != RESULT_OK || data == null) {
      null
    } else {
      val multiple = data.clipData
      when {
        multiple != null -> Array(multiple.itemCount) { index -> multiple.getItemAt(index).uri }
        data.data != null -> arrayOf(data.data!!)
        else -> null
      }
    }
    callback.onReceiveValue(chosen)
  }

  override fun onDestroy() {
    // A callback left unresolved outlives the activity and leaks the page's promise.
    pendingFileChooser?.onReceiveValue(null)
    pendingFileChooser = null
    SessionKeepAliveService.stop(this)
    // onCreate может завершиться до инициализации WebView (например, activity
    // стартовали без обязательных extras): destroy() у lateinit падал.
    if (this::webView.isInitialized) webView.destroy()
    super.onDestroy()
  }

  /**
   * System back: let the interface close its own panels first.
   *
   * The mobile layout is built to be driven by a native shell and listens for
   * `dsh-mobile:native-back` to leave a workspace or close a drawer. Without this
   * dispatch the system back button does nothing useful, which is exactly how
   * "I went in and cannot get back" feels. Only when the page has no panel left
   * to close does the activity itself go back or exit.
   */
  /** Отправить странице native-back и выйти, если она не обработала жест. */
  private fun dispatchNativeBack() {
    if (!this::webView.isInitialized) { finish(); return }
    webView.evaluateJavascript(
      // The layout ignores the event unless it is cancelable: its handler starts
      // with `if (!event.cancelable || event.defaultPrevented) return`. A plain
      // Event() is not cancelable, so dispatching one did nothing at all.
      // dispatchEvent returns false when a listener called preventDefault, which
      // is how the page reports that it consumed the press.
      "(function(){var e=new Event('dsh-mobile:native-back',{cancelable:true});" +
        "return window.dispatchEvent(e)?'unhandled':'handled';})()",
    ) { result ->
      val handled = result?.contains("handled") == true
      android.util.Log.i("dshm", "native back: $result")
      // Only leave the screen when the interface had nothing left to close, and
      // never synchronously: the panels animate before the state settles.
      if (!handled) webView.postDelayed({ if (!isFinishing) finish() }, 350)
    }
  }

  @Deprecated("Predictive back on Android 13+ uses OnBackInvokedDispatcher; this is the fallback.")
  override fun onBackPressed() {
    dispatchNativeBack()
  }

  /**
   * Hand the page its session.
   *
   * The plain cookie names are used deliberately: the gateway prefers the
   * `__Host-` spelling when TLS is on but falls back to these, so one code path
   * covers both LAN TLS and a public reverse proxy.
   *
   * @param origin gateway origin.
   * @param session session credential issued by pairing or renewal.
   * @param csrf CSRF token the page must echo on mutations, when known.
   * @param onReady invoked once every cookie is committed.
   */
  private fun installCookies(origin: String, session: String, csrf: String?, onReady: () -> Unit) {
    val manager = CookieManager.getInstance()
    manager.setAcceptCookie(true)
    // The session cookie never needs to be visible to JavaScript: the gateway reads it
    // from the request. HttpOnly+Secure+SameSite keeps it out of XSS reach and off any
    // plaintext connection; the CSRF cookie stays readable because the page must echo it.
    val secureFlag = if (origin.startsWith("https://")) "; Secure" else ""
    val cookies = buildList {
      add("${Protocol.SESSION_COOKIE}=$session; Path=/; HttpOnly$secureFlag; SameSite=Strict")
      if (csrf != null) add("dsh_ma_csrf=$csrf; Path=/; SameSite=Strict")
    }
    // The callbacks arrive on an unspecified thread, so the count is atomic: two
    // concurrent decrements on a plain `var` can both read 1 and neither reach 0,
    // and then the page is never loaded at all.
    val remaining = java.util.concurrent.atomic.AtomicInteger(cookies.size)
    for (cookie in cookies) {
      manager.setCookie(origin, cookie) {
        if (remaining.decrementAndGet() != 0) return@setCookie
        manager.flush()
        // The callback can arrive off the main thread; touching the WebView from
        // there throws, and the activity dies without a word.
        if (android.os.Looper.myLooper() != android.os.Looper.getMainLooper()) {
          android.util.Log.i("dshm", "cookie callback off the main thread; hopping back")
        }
        runOnUiThread {
        // Diagnostic: proves what the WebView store actually holds before the
        // page request goes out. Kept at debug level and free of the token.
          val stored = manager.getCookie(origin).orEmpty()
          android.util.Log.i(
            "dshm",
            "cookie store before load: names=[" +
              stored.split(';').map { it.substringBefore('=').trim() }.filter { it.isNotEmpty() }.joinToString(",") +
              "]",
          )
          onReady()
        }
      }
    }
  }

  /**
   * @param pem stored certificate text, or null when the origin is publicly trusted.
   * @return parsed certificate, or null.
   */
  private fun parseCertificate(pem: String?): X509Certificate? {
    if (pem == null) return null
    return parseCertificate(pem.toByteArray())
  }

  /**
   * @param encoded DER bytes of a certificate.
   * @return parsed certificate, or null when the bytes are not a certificate.
   */
  private fun parseCertificate(encoded: ByteArray): X509Certificate? = runCatching {
    java.security.cert.CertificateFactory.getInstance("X.509")
      .generateCertificate(encoded.inputStream()) as X509Certificate
  }.getOrNull()

  /**
   * Keeps the page on its own origin and accepts exactly the pinned certificate.
   *
   * @param origin the only origin this session may stay on.
   * @param pinned certificate the computer presented during pairing, if any.
   */
  private inner class PinnedWebViewClient(
    private val origin: String,
    private val pinned: X509Certificate?,
  ) : WebViewClient() {
    /** Whether `candidate` points at the same scheme, host and port as `expected`. */
    private fun sameOrigin(candidate: android.net.Uri, expected: String): Boolean {
      val base = runCatching { android.net.Uri.parse(expected) }.getOrNull() ?: return false
      val scheme = candidate.scheme ?: return false
      if (!scheme.equals(base.scheme, ignoreCase = true)) return false
      if (!candidate.host.equals(base.host, ignoreCase = true)) return false
      val defaultPort = if (scheme.equals("https", ignoreCase = true)) 443 else 80
      val candidatePort = if (candidate.port == -1) defaultPort else candidate.port
      val basePort = if (base.port == -1) defaultPort else base.port
      return candidatePort == basePort
    }

    /**
     * Keep the session on its own origin; send everything else to the system browser.
     *
     * The page links out to documentation, the DeepSeek platform, web-search results and
     * plugin pages. Returning `true` without an action — the previous behaviour — made
     * every such link a dead tap: the WebView refused to leave and nothing opened. An
     * external link belongs to the person's browser, not to this session's WebView.
     */
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
      val url = request.url
      // Compare scheme, host and port — not the string prefix. `startsWith` accepted
      // `https://host.evil.example/` for an origin `https://host`, and any page that
      // slips into the WebView also gains the native bridge.
      if (sameOrigin(url, origin)) return false
      runCatching {
        view.context.startActivity(
          Intent(Intent.ACTION_VIEW, url).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
      }
      return true
    }

    override fun onPageCommitVisible(view: WebView, url: String) {
      // Основной документ уже отрисован; не ждём все ассеты и длинные соединения SPA.
      loadingOverlay.visibility = android.view.View.GONE
    }

  override fun onPageFinished(view: WebView, url: String) {
      loadingOverlay.visibility = android.view.View.GONE
      // The page reports what it actually is. A gateway that refused the session
      // answers with its own text, so looking for that text distinguishes "the
      // mobile interface loaded" from "an error page loaded".
      // Rich probe: whether the application actually mounted, not just that a
      // document arrived. A page can render and still be inert if its client
      // modules failed, which looks to a person like "nothing responds".
      view.evaluateJavascript(
        "(function(){window.__dshmErrs=window.__dshmErrs||[];" +
          "window.addEventListener('error',function(e){window.__dshmErrs.push(String(e.message))});" +
          "var r=document.querySelector('#root');" +
          "return JSON.stringify({title:document.title,frontend:(window.__DSH_MOBILE_FRONTEND__||null)," +
          "boot:!!window.__DSH_BOOT__,rootChildren:r?r.children.length:-1," +
          "mobileHeader:!!document.querySelector('[data-dsh-mobile-header]')," +
          "buttons:document.querySelectorAll('button').length," +
          "text:(document.body.innerText||'').slice(0,300),errs:window.__dshmErrs.slice(0,5)});})()",
      ) { value ->
        android.util.Log.i("dshm", "page probe: $value")
        // Tell the layout a native shell is present. Its own Android client sends
        // this, and controls that need native help stay inert without it.
        view.evaluateJavascript(NATIVE_SHIM, null)
        // The phone-side layer ships with the page from the computer (plugin
        // `plugin/lib/mobile/skin.*`). The shell used to inject a second copy of its
        // own assets; that copy described the retired stock page and is gone, so the
        // page and the shell no longer maintain two competing skins.
        view.evaluateJavascript(
          "(function(){window.dispatchEvent(new Event('dsh-mobile-native-ready'));return 'ready';})()",
        ) { ready ->
          android.util.Log.i("dshm", "native ready: $ready")
          // Self-test the bridge from the page's own side: if these two calls
          // come back, the page can show notifications on this phone.
          view.evaluateJavascript(NATIVE_SELFTEST, null)
        }
      }
    }

    override fun onReceivedError(
      view: WebView,
      request: WebResourceRequest,
      error: android.webkit.WebResourceError,
    ) {
      if (request.isForMainFrame) {
        android.util.Log.i("dshm", "main frame error: ${error.errorCode} ${error.description} ${request.url}")
        loadingOverlay.visibility = android.view.View.GONE
      }
    }

    override fun onReceivedHttpError(
      view: WebView,
      request: WebResourceRequest,
      errorResponse: android.webkit.WebResourceResponse,
    ) {
      // Every resource matters here: a page whose API or module requests fail
      // renders its shell and then looks frozen to whoever is holding the phone.
      android.util.Log.i(
        "dshm",
        (if (request.isForMainFrame) "main frame" else "resource") +
          " http error: ${errorResponse.statusCode} ${request.url}",
      )
    }

    override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
      val certificate = error.certificate?.x509Certificate?.let { parseCertificate(it.encoded) }
      if (pinned != null && certificate != null && matchesPin(certificate, pinned)) {
        handler.proceed()
        return
      }
      loadingOverlay.visibility = android.view.View.GONE
      super.onReceivedSslError(view, handler, error)
    }

    /**
     * @param leaf certificate the computer presented.
     * @param pin certificate stored at pairing time.
     * @return whether the presented certificate is the pinned one or signed by it.
     */
    private fun matchesPin(leaf: X509Certificate, pin: X509Certificate): Boolean {
      if (leaf.publicKey == pin.publicKey) return true
      return runCatching {
        leaf.verify(pin.publicKey)
        true
      }.getOrDefault(false)
    }
  }

  companion object {
    /**
     * Self-test of the bridge, run from the page's own side.
     *
     * It proves the shim answers `capabilities()` and that the page can reach it,
     * which is what decides whether notifications exist on this phone at all. A
     * missing bridge looks exactly like a task that produced no notification, so
     * the answer is logged rather than assumed.
     */
    private const val NATIVE_SELFTEST = "" +
      "(function(){" +
      "if(!window.__DSH_MOBILE_NATIVE__){console.log('dshm-native: missing');return 'missing';}" +
      "return window.__DSH_MOBILE_NATIVE__.capabilities().then(function(caps){" +
      "console.log('dshm-native: caps='+caps.join(','));return 'ok';})" +
      ".catch(function(error){console.log('dshm-native: failed '+error);return 'failed';});})()"

    /**
     * Native bridge shim.
     *
     * The page expects `window.__DSH_MOBILE_NATIVE__` with `capabilities()` and
     * `invoke(method, input)`; the raw channel below it is ours. Keeping the shim
     * here means the plugin's own envelope, permission and retry logic stays
     * untouched — we only answer the two calls it makes.
     */
    private const val NATIVE_SHIM = "" +
      "(function(){" +
      "if(window.__DSH_MOBILE_NATIVE__){return 'already';}" +
      "var raw=window.__dshmNative;" +
      "if(!raw){return 'no-native';}" +
      "window.__DSH_MOBILE_NATIVE__={" +
      "capabilities:function(){return Promise.resolve(String(raw.capabilities()).split(',').filter(Boolean));}," +
      "invoke:function(method,input){return new Promise(function(resolve,reject){" +
      "try{var out=raw.invoke(String(method),JSON.stringify(input===undefined?{}:input));" +
      "var parsed=JSON.parse(out);" +
      "if(parsed&&parsed.error){var e=new Error(parsed.error.message||'native error');e.code=parsed.error.code||'failed';reject(e);}else{resolve(parsed||{});}" +
      "}catch(err){reject(err);}});}" +
      "};return 'installed';})()"

    /** Gateway origin to open. */
    const val EXTRA_ORIGIN = "origin"

    /** Session credential for that gateway. */
    const val EXTRA_SESSION = "session"

    /** CSRF token for mutations, when the computer issued one. */
    const val EXTRA_CSRF = "csrf"

    /** Pinned certificate in PEM form, or null for a publicly trusted origin. */
    const val EXTRA_CA = "ca"

    /**
     * Asks the page whether a turn is running.
     *
     * The stop button exists exactly while a run is in flight and is labelled by the
     * interface itself, so its presence is the state — no parsing of text needed beyond
     * matching the label the interface already uses.
     */
    /**
     * Asks the page whether a turn is running.
     *
     * The state is the interface's own, not a guess from button labels: the composer
     * card carries `aria-busy` while a turn is in flight, and the text field is disabled
     * while a turn cannot accept typing. This mirrors what the computer side's own
     * notification watcher uses (`readComposerBusyState`), so the shell and the page
     * agree on what "busy" means.
     */
    const val BUSY_PROBE =
      "(function(){" +
        "var card=document.querySelector('[data-composer-card]');" +
        "if(!card){return '';}" +
        "if(card.getAttribute('aria-busy')==='true'){return 'busy';}" +
        "var field=card.querySelector('textarea,input,[contenteditable=\"true\"],[contenteditable=\"plaintext-only\"]');" +
        "if(!field){return '';}" +
        "if(field.disabled===true||field.readOnly===true||field.getAttribute('aria-disabled')==='true'){return 'busy';}" +
        "return '';})()"

    /** Request code for the page's file chooser. */
    const val REQUEST_FILE_CHOOSER = 41

  }
}
