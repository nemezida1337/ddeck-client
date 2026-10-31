package ai.dshm.client.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder

/**
 * Keeps the session process alive while the person is away from the phone.
 *
 * Why this exists: Android freezes a backgrounded application, and a frozen process runs
 * nothing — no timers, no DOM observer. Measured on the phone: a page timer collected
 * about half its ticks across a 39-second window of which 20 were in the background, and
 * the computer side's question watcher never called the notification bridge at all while
 * the screen was hidden. Task completion still arrived, because its event comes over the
 * network before the freeze. A question that appears after the freeze was simply lost.
 *
 * A foreground service is the platform's answer to exactly this: the process is not
 * frozen, so the page keeps running and its own watcher can do its job. The cost is the
 * ongoing notification, which is why it says plainly what it is for and disappears the
 * moment the person comes back.
 *
 * The service owns no logic of its own — it is a reason for the system not to freeze the
 * process. Everything that decides *whether* to notify still lives in the page.
 */
class SessionKeepAliveService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // startForeground() обязан быть вызван сразу: приложение стартует сервис
    // через startForegroundService() и система ждёт подтверждения считанные
    // секунды, иначе процесс падает с ForegroundServiceDidNotStartInTime.
    Notifications.ensureSessionChannel(this)
    val notification: Notification = Notifications.sessionNotification(this)
    try {
      startForeground(Notifications.ID_SESSION, notification)
    } catch (error: RuntimeException) {
      android.util.Log.w("dshm", "keep-alive startForeground failed", error)
      stopSelf()
    }
    // Not sticky: coming back from a dead process should not resurrect a silent service
    // with no session behind it.
    return START_NOT_STICKY
  }

  companion object {
    /**
     * Ask the platform to keep this process running while the session is in the background.
     *
     * @param context any context of the application.
     */
    fun start(context: Context) {
      val intent = Intent(context, SessionKeepAliveService::class.java)
      runCatching { context.startForegroundService(intent) }
        .onFailure { android.util.Log.w("dshm", "keep-alive start rejected", it) }
    }

    /**
     * Stop keeping the process alive; safe to call when it was never started.
     *
     * @param context any context of the application.
     */
    fun stop(context: Context) {
      runCatching { context.stopService(Intent(context, SessionKeepAliveService::class.java)) }
    }
  }
}
