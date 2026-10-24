package ai.dshm.client.app

import ai.dshm.client.GatewayException
import ai.dshm.client.MobileClient
import ai.dshm.client.parsePairingLink
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.util.Base64
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.util.concurrent.Executors

/**
 * First screen: choose a paired computer or pair a new one.
 *
 * Pairing needs two values from the computer's **Remote** panel: its
 * origin (the address the phone can reach) and a one-time pairing key. Both come
 * from the same panel that shows the QR code; scanning that QR is the next
 * convenience step, not a requirement — the key is what authenticates.
 */
class ConnectActivity : Activity() {
  /** A computer and the live session opened against it. */
  private data class Opened(val computer: PairedComputer, val session: String, val csrf: String?)

  private val worker = Executors.newSingleThreadExecutor()

  /** Opens the library's QR capture activity; the link it returns carries the key. */
  private fun scanQr() {
    com.google.zxing.integration.android.IntentIntegrator(this)
      .setDesiredBarcodeFormats(com.google.zxing.integration.android.IntentIntegrator.QR_CODE)
      .setPrompt(getString(R.string.connect_qr_prompt))
      .setBeepEnabled(false)
      .setOrientationLocked(false)
      .initiateScan()
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    val scanned = com.google.zxing.integration.android.IntentIntegrator.parseActivityResult(requestCode, resultCode, data)
    val content = scanned?.contents
    if (content != null) {
      originField.setText(content)
      keyField.setText("")
      pair(content, "", pairButton)
      return
    }
    super.onActivityResult(requestCode, resultCode, data)
  }
  private val store by lazy { PairedComputerStore(applicationContext) }
  private lateinit var status: TextView
  private lateinit var computers: LinearLayout
  private lateinit var originField: EditText
  private lateinit var keyField: EditText
  private lateinit var pairButton: Button

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Debug builds expose the WebView to `chrome://inspect` over adb. Shaping the
    // mobile layer means measuring it in a real phone viewport, and a debugger is
    // the only honest way to read computed styles from the page the plugin serves.
    // The release build keeps the WebView closed.
    if (BuildConfig.DEBUG) android.webkit.WebView.setWebContentsDebuggingEnabled(true)
    setContentView(buildLayout())
    renderComputers()

    // Поворот/пересоздание: возвращаем введённое, но не повторяем pair() и не
    // перечитываем одноразовый ключ из intent — он уже мог быть потрачен.
    if (savedInstanceState != null) {
      originField.setText(savedInstanceState.getString(STATE_ORIGIN, ""))
      keyField.setText(savedInstanceState.getString(STATE_KEY, ""))
    } else {
      // Prefill from the launching intent so a deep link, a QR scan or an automated
      // test can drive pairing without typing.
      val presetOrigin = intent.getStringExtra(EXTRA_ORIGIN)
      val presetKey = intent.getStringExtra(EXTRA_KEY)
      val presetInstance = intent.getStringExtra(EXTRA_INSTANCE)
      if (presetOrigin != null) originField.setText(presetOrigin)
      if (presetKey != null) keyField.setText(presetKey)
      // The whole invite is enough: its fragment already carries the key, so a
      // pasted link starts pairing without a second field.
      if (presetOrigin != null && (presetKey != null || parsePairingLink(presetOrigin) != null)) {
        pair(presetOrigin, presetKey ?: "", pairButton, presetInstance)
        return
      }
    }
    // Nothing to pair: opening the app is almost always "take me back to my
    // computer", so the last one used is opened without a tap. The list stays
    // visible underneath, and a failed attempt only writes a status line — the
    // person can still pick another computer or pair a new one.
    // `savedInstanceState == null` means a fresh screen rather than a rotation, so
    // a configuration change cannot start a second attempt on top of the first.
    if (savedInstanceState == null) {
      store.mostRecent()?.let { connect(it) }
    }
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    if (::originField.isInitialized) outState.putString(STATE_ORIGIN, originField.text.toString())
    if (::keyField.isInitialized) outState.putString(STATE_KEY, keyField.text.toString())
  }

  override fun onDestroy() {
    worker.shutdownNow()
    super.onDestroy()
  }

  /** @return the whole screen, built in code to keep the shell free of layout resources. */
  private fun buildLayout(): ScrollView {
    val column = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(48, 64, 48, 64)
    }
    column.addView(title(getString(R.string.app_name)))
    column.addView(hint(getString(R.string.connect_subtitle)))

    column.addView(label(getString(R.string.connect_origin_label)))
    originField = EditText(this).apply {
      hint = getString(R.string.connect_origin_hint)
      inputType = InputType.TYPE_TEXT_VARIATION_URI
      setSingleLine()
    }
    column.addView(originField)

    column.addView(label(getString(R.string.connect_key_label)))
    keyField = EditText(this).apply {
      hint = getString(R.string.connect_key_hint)
      inputType = InputType.TYPE_CLASS_TEXT
      setSingleLine()
    }
    column.addView(keyField)

    val scan = Button(this).apply { text = getString(R.string.connect_scan_qr) }
    scan.setOnClickListener {
      scanQr()
    }
    column.addView(scan)

    pairButton = Button(this).apply { text = getString(R.string.connect_pair) }
    pairButton.setOnClickListener { pair(originField.text.toString(), keyField.text.toString(), pairButton) }
    column.addView(pairButton)

    status = TextView(this).apply {
      setPadding(0, 24, 0, 24)
      setTextColor(Color.GRAY)
    }
    column.addView(status)

    column.addView(label(getString(R.string.connect_saved_label)))
    computers = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    column.addView(computers)

    val root = ScrollView(this).apply { addView(column) }
    // Edge-to-edge with a cutout needs explicit insets: without them the heading
    // is drawn under the clock, and the keyboard covers the fields.
    androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
      val bars = insets.getInsets(
        androidx.core.view.WindowInsetsCompat.Type.systemBars() or
          androidx.core.view.WindowInsetsCompat.Type.ime(),
      )
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      insets
    }
    return root
  }

  /**
   * @param text heading text.
   * @return a heading view.
   */
  private fun title(text: String): TextView = TextView(this).apply {
    this.text = text
    textSize = 24f
    setPadding(0, 0, 0, 8)
  }

  /**
   * @param text explanatory text.
   * @return a secondary line.
   */
  private fun hint(text: String): TextView = TextView(this).apply {
    this.text = text
    textSize = 14f
    setTextColor(Color.GRAY)
    setPadding(0, 0, 0, 32)
  }

  /**
   * @param text field label.
   * @return a field label view.
   */
  private fun label(text: String): TextView = TextView(this).apply {
    this.text = text
    textSize = 13f
    setPadding(0, 16, 0, 4)
  }

  /** Repaint the saved-computer list. */
  private fun renderComputers() {
    computers.removeAllViews()
    val saved = store.list()
    if (saved.isEmpty()) {
      computers.addView(hint(getString(R.string.connect_saved_empty)))
      return
    }
    for (computer in saved.reversed()) {
      val row = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        setPadding(0, 8, 0, 8)
      }
      val open = Button(this).apply {
        text = computer.label
        layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        setOnClickListener { connect(computer) }
      }
      val forget = Button(this).apply {
        text = getString(R.string.connect_forget)
        setOnClickListener {
          store.forget(computer.origin)
          renderComputers()
        }
      }
      row.addView(open)
      row.addView(forget)
      computers.addView(row)
    }
  }

  /**
   * Pair with a computer and open its interface.
   *
   * @param rawOrigin origin typed by the user.
   * @param rawKey one-time pairing key.
   * @param button button to re-enable when the attempt finishes.
   */
  private fun pair(rawOrigin: String, rawKey: String, button: Button, expectedInstance: String? = null) {
    // The address field also accepts the whole pairing link, so a person can paste
    // what the computer shows instead of splitting it by hand.
    val invite = parsePairingLink(rawOrigin)
    val origin = (invite?.origin ?: rawOrigin.trim()).trimEnd('/')
    val pairingKey = (invite?.token ?: rawKey.trim())
    if (origin.isEmpty() || (pairingKey.isEmpty() && invite == null)) {
      Toast.makeText(this, getString(R.string.connect_need_origin_or_link), Toast.LENGTH_SHORT).show()
      return
    }
    button.isEnabled = false
    status.text = getString(R.string.connect_pairing)
    worker.execute {
      val result = runCatching {
        // A LAN gateway presents a self-signed certificate, so identity is
        // established by the invite: fetch the CA, require its fingerprint to match
        // the instanceId from the link, and only then trust that CA for the rest.
        val bootstrap = MobileClient(origin)
        // Pin the CA from the invitation (QR/link) or from an explicit `instance`
        // intent extra; a bare address still falls back to the first certificate (TOFU).
        val expected = invite?.instanceId ?: expectedInstance
        val ca = if (origin.startsWith("https://")) bootstrap.bootstrapCa(expected) else null
        if (origin.startsWith("https://") && ca == null) {
          error(getString(R.string.connect_error_identity))
        }
        val client = MobileClient(origin, ca)
        val discovery = client.discover()
        val caPem = ca?.let { toPem(it.encoded) }
        val credential = client.pair(
          pairingKey,
          android.os.Build.MODEL ?: "android",
          DeviceIdentity.fingerprint(this),
        )
        Opened(
          computer = PairedComputer(
            origin = origin,
            label = discovery.deviceName,
            deviceToken = credential.deviceToken,
            caPem = caPem,
          ),
          session = credential.sessionToken,
          csrf = credential.csrfToken,
        )
      }
      runOnUiThread {
        if (isFinishing || isDestroyed) return@runOnUiThread
        button.isEnabled = true
        result.fold(
          onSuccess = { opened ->
            store.save(opened.computer)
            status.text = getString(R.string.connect_paired, opened.computer.label)
            renderComputers()
            open(opened)
          },
          onFailure = { error -> status.text = describe(error) },
        )
      }
    }
  }

  /**
   * Reconnect to a stored computer by renewing its session.
   *
   * @param computer stored record to open.
   */
  private fun connect(computer: PairedComputer) {
    status.text = getString(R.string.connect_reconnecting, computer.label)
    // Touching the record makes it the most recent one, which is what the next
    // launch opens first. It happens before the attempt so a computer that is
    // simply offline is still the one tried again next time.
    store.touch(computer.origin)
    worker.execute {
      val result = runCatching {
        val client = MobileClient(computer.origin, pinnedCertificate(computer.caPem))
        client.adoptDeviceToken(computer.deviceToken)
        val renewed = client.renew()
        Opened(computer, renewed.sessionToken, renewed.csrfToken)
      }
      runOnUiThread {
        if (isFinishing || isDestroyed) return@runOnUiThread
        result.fold(
          onSuccess = { opened -> open(opened) },
          onFailure = { error ->
            // The "pair again" advice belongs to a refused credential, not to a
            // timeout: telling someone to re-pair when the computer is simply off
            // sends them to redo work that was never lost.
            val message = if (error is GatewayException && error.status in 401..404) {
              getString(R.string.connect_failed_repair, describe(error))
            } else {
              getString(R.string.connect_failed, describe(error))
            }
            status.text = message
          },
        )
      }
    }
  }

  /**
   * @param opened computer to show together with its live session.
   */
  private fun open(opened: Opened) {
    startActivity(
      Intent(this, SessionActivity::class.java)
        .putExtra(SessionActivity.EXTRA_ORIGIN, opened.computer.origin)
        .putExtra(SessionActivity.EXTRA_SESSION, opened.session)
        .putExtra(SessionActivity.EXTRA_CSRF, opened.csrf)
        .putExtra(SessionActivity.EXTRA_CA, opened.computer.caPem),
    )
  }

  /**
   * @param der certificate bytes.
   * @return PEM text.
   */
  private fun toPem(der: ByteArray): String =
    "-----BEGIN CERTIFICATE-----\n" +
      Base64.encodeToString(der, Base64.NO_WRAP).chunked(64).joinToString("\n") +
      "\n-----END CERTIFICATE-----\n"

  /**
   * @param pem stored PEM text, or null.
   * @return parsed certificate, or null when absent.
   */
  private fun pinnedCertificate(pem: String?): java.security.cert.X509Certificate? {
    if (pem == null) return null
    return runCatching {
      val factory = java.security.cert.CertificateFactory.getInstance("X.509")
      factory.generateCertificate(pem.byteInputStream()) as java.security.cert.X509Certificate
    }.getOrNull()
  }

  companion object {
    /** Origin to prefill, for a deep link, QR hand-off or automated test. */
    const val EXTRA_ORIGIN = "origin"
  /** CA fingerprint from the pairing payload; pins the certificate even without a QR link. */
  const val EXTRA_INSTANCE = "instance"

    /** One-time pairing key to prefill. */
    const val EXTRA_KEY = "key"

    /** Введённый адрес, который надо вернуть после поворота экрана. */
    const val STATE_ORIGIN = "connect.origin"

    /** Введённый ключ, который надо вернуть после поворота экрана. */
    const val STATE_KEY = "connect.key"
  }

  /**
   * @param error failure raised by the protocol layer.
   * @return a message a person can act on.
   */
  private fun describe(error: Throwable): String {
    networkProblem(error)?.let { return it }
    return when (error) {
      is GatewayException -> when (error.status) {
        401, 403 -> getString(R.string.connect_error_key_rejected, error.status)
        404 -> getString(R.string.connect_error_no_mobile_access)
        // 409 значит «предел устройств»: компьютер отказывает, потому что подключено уже
        // слишком много. Голое число человеку не говорит, что делать.
        409 -> getString(R.string.connect_error_device_limit)
        429 -> getString(R.string.connect_error_too_many_attempts)
        502, 503 -> getString(R.string.connect_error_unavailable, error.status)
        else -> getString(R.string.connect_error_status, error.status)
      }
      else -> error.message ?: error.toString()
    }
  }

  /**
   * Explain a transport failure in the words a person would use.
   *
   * Without this the screen shows OkHttp's own text — "failed to connect to
   * 100.x.y.z (port 3449) … after 10000ms" — which names the library, not the
   * problem, and is in the wrong language for the rest of this interface.
   *
   * @param error failure raised by the transport.
   * @return a sentence, or null when this is not a transport failure.
   */
  private fun networkProblem(error: Throwable): String? {
    val chain = generateSequence(error) { it.cause }.take(5).toList()
    val text = chain.joinToString(" ") { it.message.orEmpty() }.lowercase()
    return when {
      // A certificate mismatch reads as "wrong key" to everyone who has not met it
      // before, so it is named explicitly.
      chain.any { it is javax.net.ssl.SSLException } ->
        getString(R.string.connect_error_certificate)
      chain.any { it is java.net.UnknownHostException } ->
        getString(R.string.connect_error_host_not_found)
      chain.any { it is java.net.SocketTimeoutException } || text.contains("after") && text.contains("ms") ->
        getString(R.string.connect_error_timeout)
      chain.any { it is java.net.ConnectException } ->
        getString(R.string.connect_error_refused)
      chain.any { it is java.io.IOException } ->
        getString(R.string.connect_error_network)
      else -> null
    }
  }
}
