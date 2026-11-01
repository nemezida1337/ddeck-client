package ai.dshm.client.app

import android.app.Notification
import android.app.PendingIntent
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.inputmethod.InputMethodManager
import android.webkit.WebView
import android.content.Intent
import android.webkit.JavascriptInterface
import org.json.JSONObject

/**
 * The native side of the page's bridge.
 *
 * The mobile layer reads `window.__DSH_MOBILE_NATIVE__` and calls
 * `capabilities()` then `invoke(method, input)`. Those two calls arrive here
 * through the shim installed by [SessionActivity]; everything else — the
 * envelope, retries, permission handling on the page — stays in the plugin.
 *
 * The surface is deliberately tiny: a bridge that exposes more than the page
 * needs is more attack surface on a credential that controls a computer.
 *
 * @param context context used to reach the notification service.
 */
class NativeBridge(
  private val context: Context,
  private val webView: WebView,
) {
  /**
   * @return comma-separated capabilities the page may use.
   */
  @JavascriptInterface
  fun capabilities(): String = CAPABILITIES.joinToString(",")

  /**
   * Run one action requested by the page.
   *
   * @param method action name, for example `notification.notify`.
   * @param inputJson JSON object with the action's input.
   * @return JSON object with the result, or `{"error": {...}}` on refusal.
   */
  @JavascriptInterface
  fun invoke(method: String, inputJson: String): String {
    return try {
      when (method) {
        "notification.notify" -> notify(JSONObject(inputJson))
        "notification.settings" -> openNotificationSettings()
        "keyboard.show" -> showKeyboard()
        "haptic.tap" -> haptic(JSONObject(inputJson))
        else -> error("unsupported", context.getString(R.string.bridge_error_unsupported, method))
      }
    } catch (failure: Exception) {
      error("failed", failure.message ?: failure.toString())
    }
  }

  /**
   * A short tactile confirmation for a tap in the mobile layer.
   *
   * The dock is icon-only, so a 6–10 ms tick makes a press feel real. Duration is
   * clamped: the page may ask for less, never for a long buzz.
   *
   * @param input optional `duration` in milliseconds.
   * @return `{}` after scheduling the vibration.
   */
  private fun haptic(input: JSONObject): String {
    val requested = input.optInt("duration", 8).coerceIn(4, 40)
    try {
      val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        manager.defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      }
      if (!vibrator.hasVibrator()) return error("unsupported", context.getString(R.string.bridge_error_unsupported, "haptic.tap"))
      vibrator.vibrate(VibrationEffect.createOneShot(requested.toLong(), VibrationEffect.DEFAULT_AMPLITUDE))
      return "{}"
    } catch (failure: SecurityException) {
      return error("permission_denied", failure.message ?: "VIBRATE permission is missing")
    }
  }

  /**
   * Open the software keyboard for the focused editable element.
   *
   * xterm.js focuses its hidden textarea from JavaScript, outside the touch gesture,
   * and Android-WebView does not raise the keyboard for such a focus: measured —
   * `innerHeight` stayed 800 and the terminal could not be typed into. The page asks
   * this bridge instead; the request runs on the main thread after the focus lands.
   *
   * @return `{}` after scheduling the keyboard.
   */
  private fun showKeyboard(): String {
    Handler(Looper.getMainLooper()).post {
      val manager = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
      manager.showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT)
    }
    return "{}"
  }

  /**
   * Show one task notification, collapsing repeats that carry the same tag.
   *
   * @param input object with `title`, `body` and `tag`.
   * @return `{}` on success.
   */
  private fun notify(input: JSONObject): String {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (!manager.areNotificationsEnabled()) {
      return error("permission_denied", context.getString(R.string.bridge_error_notifications_disabled))
    }
    Notifications.ensureTaskChannel(context)
    val title = input.optString("title").ifEmpty { context.getString(R.string.notification_fallback_title) }
    val body = input.optString("body")
    val tag = input.optString("tag").ifEmpty { "task" }
    // A notification that only lights up and cannot be tapped is a dead end: the
    // person taps it, nothing happens, and the task stays unopened. Open the session
    // screen (the same activity the ongoing notice opens) and let the tap dismiss it.
    // Task content can be sensitive, so the lock screen stays generic.
    val notification = Notifications.base(context, Notifications.CHANNEL_TASKS, title, body)
      .setContentIntent(Notifications.openApp(context))
      .setAutoCancel(true)
      .build()
    manager.notify(tag, Notifications.ID_TASK, notification)
    return "{}"
  }

  /** @return `{}`; the page only needs the settings screen to open. */
  private fun openNotificationSettings(): String {
    val intent = android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS)
      .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName)
      .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
    return "{}"
  }

  /**
   * @param code machine-readable failure code the page branches on.
   * @param message human-readable reason.
   * @return JSON error envelope.
   */
  private fun error(code: String, message: String): String =
    JSONObject().put("error", JSONObject().put("code", code).put("message", message)).toString()

  private companion object {
    /** Only what this build actually implements; the page checks before calling. */
    val CAPABILITIES = listOf("notification.notify", "notification.settings", "keyboard.show", "haptic.tap")
  }
}
