package ai.dshm.client.app

import ai.dshm.client.GatewayException
import ai.dshm.client.MobileClient
import ai.dshm.client.parsePairingLink
import android.app.Activity
import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.net.Uri
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.util.Base64
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.WindowInsetsControllerCompat
import java.util.concurrent.Executors
import kotlin.math.roundToInt

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
  private lateinit var manualSection: LinearLayout
  private lateinit var manualToggle: Button
  private lateinit var statusCard: LinearLayout
  private lateinit var progress: ProgressBar
  private var lastMessage: String = ""

  private val bgColor = Color.parseColor("#12151C")
  private val card = Color.parseColor("#1B1B1C")
  private val ink = Color.parseColor("#F5F6F8")
  private val muted = Color.parseColor("#A7ABB5")
  private val accent = Color.parseColor("#6B8AFD")
  private val line = Color.parseColor("#2B2D34")
  private val danger = Color.parseColor("#E0A3A3")

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Debug builds expose the WebView to `chrome://inspect` over adb. Shaping the
    // mobile layer means measuring it in a real phone viewport, and a debugger is
    // the only honest way to read computed styles from the page the plugin serves.
    // The release build keeps the WebView closed.
    if (BuildConfig.DEBUG) android.webkit.WebView.setWebContentsDebuggingEnabled(true)
    WindowInsetsControllerCompat(window, window.decorView).apply {
      isAppearanceLightStatusBars = false
      isAppearanceLightNavigationBars = false
    }
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
    window.statusBarColor = bgColor
    window.navigationBarColor = bgColor

    val column = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(bgColor)
      setPadding(dp(24), dp(28), dp(24), dp(32))
    }

    val header = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(0, 0, 0, dp(18))
    }
    val mark = ImageView(this).apply {
      setImageResource(R.drawable.ic_launcher_foreground)
      contentDescription = getString(R.string.app_name)
      layoutParams = LinearLayout.LayoutParams(dp(96), dp(96))
    }
    header.addView(mark)
    header.addView(TextView(this).apply {
      text = getString(R.string.app_name)
      textSize = 30f
      setTextColor(ink)
      gravity = Gravity.CENTER
      setPadding(0, dp(10), 0, dp(4))
    })
    header.addView(TextView(this).apply {
      text = getString(R.string.connect_subtitle)
      textSize = 15f
      setTextColor(muted)
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, 0)
    })
    column.addView(header)

    column.addView(TextView(this).apply {
      text = getString(R.string.connect_lead)
      textSize = 15f
      setTextColor(ink)
      gravity = Gravity.CENTER
      setPadding(dp(6), 0, dp(6), dp(20))
    })

    val scan = actionButton(getString(R.string.connect_scan_qr), primary = true)
    scan.setOnClickListener { scanQr() }
    column.addView(scan)

    manualToggle = actionButton(getString(R.string.connect_manual_open), primary = false)
    manualToggle.setOnClickListener {
      val open = manualSection.visibility != ViewGroup.VISIBLE
      manualSection.visibility = if (open) ViewGroup.VISIBLE else ViewGroup.GONE
      manualToggle.text = getString(if (open) R.string.connect_manual_close else R.string.connect_manual_open)
    }
    column.addView(manualToggle)

    manualSection = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      visibility = ViewGroup.GONE
      setPadding(0, dp(10), 0, dp(4))
    }
    manualSection.addView(sectionLabel(getString(R.string.connect_manual_title)))
    manualSection.addView(sectionLabel(getString(R.string.connect_origin_label)))
    originField = styledField(getString(R.string.connect_origin_hint), InputType.TYPE_TEXT_VARIATION_URI)
    manualSection.addView(originField)
    manualSection.addView(sectionLabel(getString(R.string.connect_key_label)))
    keyField = styledField(getString(R.string.connect_key_hint), InputType.TYPE_CLASS_TEXT)
    manualSection.addView(keyField)
    pairButton = actionButton(getString(R.string.connect_pair), primary = true)
    pairButton.setOnClickListener { pair(originField.text.toString(), keyField.text.toString(), pairButton) }
    manualSection.addView(pairButton)
    column.addView(manualSection)

    val help = TextView(this).apply {
      text = getString(R.string.connect_help_button)
      textSize = 15f
      setTextColor(accent)
      gravity = Gravity.CENTER
      setPadding(0, dp(14), 0, dp(8))
      isClickable = true
      setOnClickListener { showHelpDialog() }
    }
    column.addView(help)

    statusCard = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      visibility = ViewGroup.GONE
      background = rounded(card, 14f, line)
      setPadding(dp(14), dp(10), dp(14), dp(10))
      layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
        topMargin = dp(14)
      }
    }
    progress = ProgressBar(this, null, android.R.attr.progressBarStyleSmall).apply {
      visibility = ViewGroup.GONE
      layoutParams = LinearLayout.LayoutParams(dp(20), dp(20)).apply { marginEnd = dp(10) }
    }
    status = TextView(this).apply {
      textSize = 14f
      setTextColor(muted)
    }
    statusCard.addView(progress)
    statusCard.addView(status, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
    column.addView(statusCard)

    column.addView(sectionLabel(getString(R.string.connect_saved_label)).apply { setPadding(0, dp(22), 0, dp(6)) })
    computers = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    column.addView(computers)

    val version = TextView(this).apply {
      text = "DDeck ${BuildConfig.VERSION_NAME}"
      textSize = 12f
      setTextColor(muted)
      gravity = Gravity.CENTER
      setPadding(0, dp(22), 0, 0)
      setOnLongClickListener {
        showDiagnostics()
        true
      }
    }
    column.addView(version)

    val root = ScrollView(this).apply {
      setBackgroundColor(bgColor)
      isFillViewport = true
      addView(column)
    }
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

  /** @return value in device pixels. */
  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).roundToInt()

  /** @return rounded surface. */
  private fun rounded(color: Int, radiusDp: Float, strokeColor: Int? = null): GradientDrawable =
    GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      setColor(color)
      cornerRadius = dp(radiusDp.toInt()).toFloat()
      if (strokeColor != null) setStroke(dp(1), strokeColor)
    }

  /** @return a filled or outlined action button. */
  private fun actionButton(text: String, primary: Boolean): Button = Button(this).apply {
    this.text = text
    isAllCaps = false
    textSize = 16f
    setTextColor(if (primary) Color.WHITE else ink)
    background = if (primary) rounded(accent, 16f) else rounded(Color.TRANSPARENT, 16f, line)
    minHeight = dp(54)
    layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
      topMargin = dp(10)
    }
  }

  /** @return a text field styled like the rest of the screen. */
  private fun styledField(hintText: String, type: Int): EditText = EditText(this).apply {
    hint = hintText
    inputType = type
    setSingleLine()
    textSize = 16f
    setTextColor(ink)
    setHintTextColor(muted)
    background = rounded(card, 14f, line)
    setPadding(dp(14), dp(13), dp(14), dp(13))
    minHeight = dp(54)
    layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
      topMargin = dp(4)
    }
  }

  /** @return a small muted section label. */
  private fun sectionLabel(text: String): TextView = TextView(this).apply {
    this.text = text
    textSize = 13f
    setTextColor(muted)
    setPadding(0, dp(12), 0, dp(4))
  }

  /** Show a status line; empty hides the surface. */
  private fun setStatus(text: String, isError: Boolean = false, busy: Boolean = false) {
    val shown = if (isError) text.replaceFirstChar { it.titlecase() } else text
    statusCard.visibility = ViewGroup.VISIBLE
    lastMessage = shown
    status.text = shown
    status.setTextColor(if (isError) danger else muted)
    progress.visibility = if (busy) ViewGroup.VISIBLE else ViewGroup.GONE
  }

  /** Open the step-by-step guide without leaving the app. */
  private fun showHelpDialog() {
    val docs = "https://github.com/nemezida1337/ddeck-client/blob/main/docs/CONNECT.md"
    val dialog = AlertDialog.Builder(this)
      .setCustomTitle(TextView(this).apply {
        text = getString(R.string.connect_help_button)
        textSize = 20f
        setTextColor(ink)
        setPadding(dp(22), dp(18), dp(22), dp(2))
      })
      .setMessage(getString(R.string.connect_help_steps) + "\n\n" + getString(R.string.connect_help_troubleshoot))
      .setPositiveButton(getString(R.string.connect_help_close), null)
      .setNeutralButton(getString(R.string.connect_help_docs)) { _, _ ->
        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(docs)))
      }
      .create()
    styleDarkDialog(dialog)
    dialog.show()
  }

  /** Привести системный диалог к тёмной палитре DDeck. */
  private fun styleDarkDialog(dialog: AlertDialog) {
    dialog.setOnShowListener {
      dialog.window?.setBackgroundDrawable(rounded(card, 22f, line))
      dialog.window?.setDimAmount(0.62f)
      dialog.findViewById<TextView>(android.R.id.title)?.setTextColor(ink)
      dialog.findViewById<TextView>(android.R.id.message)?.apply {
        setTextColor(muted)
        setTextSize(14.5f)
        setPadding(dp(20), dp(4), dp(20), dp(10))
      }
      dialog.getButton(AlertDialog.BUTTON_POSITIVE)?.setTextColor(accent)
      dialog.getButton(AlertDialog.BUTTON_NEUTRAL)?.setTextColor(accent)
      dialog.getButton(AlertDialog.BUTTON_NEGATIVE)?.setTextColor(muted)
    }
  }

  /** Показать диагностику для баг-репорта; секретов здесь нет. */
  private fun showDiagnostics() {
    val origins = store.list().joinToString("; ") { it.origin }
    val text = buildString {
      appendLine("DDeck ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
      appendLine("Android ${android.os.Build.VERSION.RELEASE} / API ${android.os.Build.VERSION.SDK_INT}")
      appendLine("Устройство: ${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}")
      appendLine("Сохранённые компьютеры: ${origins.ifEmpty { "нет" }}")
      appendLine("Последний статус: ${lastMessage.ifEmpty { "нет" }}")
    }
    val dialog = AlertDialog.Builder(this)
      .setCustomTitle(TextView(this).apply {
        this.text = getString(R.string.diagnostics_title)
        textSize = 20f
        setTextColor(ink)
        setPadding(dp(22), dp(18), dp(22), dp(2))
      })
      .setMessage(text)
      .setPositiveButton(getString(R.string.diagnostics_copy)) { _, _ ->
        val clipboard = getSystemService(ClipboardManager::class.java)
        clipboard.setPrimaryClip(ClipData.newPlainText("DDeck diagnostics", text))
        Toast.makeText(this, getString(R.string.diagnostics_copied), Toast.LENGTH_SHORT).show()
      }
      .setNegativeButton(getString(R.string.connect_help_close), null)
      .create()
    styleDarkDialog(dialog)
    dialog.show()
  }

  /** Repaint the saved-computer list. */
  private fun renderComputers() {
    computers.removeAllViews()
    val saved = store.list()
    if (saved.isEmpty()) {
      computers.addView(TextView(this).apply {
        text = getString(R.string.connect_saved_empty)
        textSize = 14f
        setTextColor(muted)
        setPadding(0, dp(6), 0, dp(10))
      })
      return
    }
    for (computer in saved.reversed()) {
      val cardView = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        background = rounded(card, 16f, line)
        setPadding(dp(16), dp(12), dp(12), dp(10))
        isClickable = true
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
          topMargin = dp(8)
        }
        setOnClickListener { connect(computer) }
      }
      cardView.addView(TextView(this).apply {
        text = computer.label
        textSize = 16f
        setTextColor(ink)
        maxLines = 1
        ellipsize = android.text.TextUtils.TruncateAt.END
      })
      cardView.addView(TextView(this).apply {
        text = computer.origin
        textSize = 12f
        setTextColor(muted)
        maxLines = 1
        ellipsize = android.text.TextUtils.TruncateAt.END
        setPadding(0, dp(2), 0, dp(6))
      })
      val actions = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.END
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
      }
      actions.addView(Button(this).apply {
        text = getString(R.string.connect_open)
        isAllCaps = false
        textSize = 14f
        setTextColor(Color.WHITE)
        background = rounded(accent, 12f)
        minWidth = dp(84)
        minHeight = dp(40)
        setPadding(dp(14), 0, dp(14), 0)
        setOnClickListener { connect(computer) }
      })
      actions.addView(Button(this).apply {
        text = getString(R.string.connect_forget)
        isAllCaps = false
        textSize = 14f
        setTextColor(muted)
        background = rounded(Color.TRANSPARENT, 12f)
        minWidth = dp(72)
        minHeight = dp(40)
        setOnClickListener {
          store.forget(computer.origin)
          renderComputers()
        }
      })
      cardView.addView(actions)
      computers.addView(cardView)
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
    setStatus(getString(R.string.connect_pairing), busy = true)
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
            setStatus(getString(R.string.connect_paired, opened.computer.label))
            renderComputers()
            open(opened)
          },
          onFailure = { error -> setStatus(describe(error), isError = true) },
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
    setStatus(getString(R.string.connect_reconnecting, computer.label), busy = true)
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
            setStatus(message, isError = true)
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
