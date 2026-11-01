package ai.dshm.client.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent

/**
 * Единые каналы, идентификаторы и фабрики уведомлений приложения.
 *
 * До этого каналы/ID/Builder/PendingIntent собирались в трёх классах
 * (Bridge, Activity, Service): правка иконки, важности или перехода
 * доезжала только до одного места. Здесь один владелец контракта; вызывающие
 * классы отвечают только за своё содержимое.
 */
object Notifications {
  /** Канал уведомлений о фоновых задачах. */
  const val CHANNEL_TASKS = "dshm_tasks"

  /** Канал уведомлений о скачанных файлах. */
  const val CHANNEL_FILES = "dshm_files"

  /** Канал постоянного уведомления keep-alive. */
  const val CHANNEL_SESSION = "dshm_session"

  /** ID уведомления о задаче. */
  const val ID_TASK = 7101

  /** ID уведомления о файле. */
  const val ID_FILE = 7102

  /** ID постоянного уведомления сессии. */
  const val ID_SESSION = 7104

  /**
   * Создать канал задач.
   *
   * @param context контекст приложения.
   */
  fun ensureTaskChannel(context: Context) {
    ensureChannel(context, CHANNEL_TASKS, R.string.channel_tasks_name, R.string.channel_tasks_description, NotificationManager.IMPORTANCE_DEFAULT)
  }

  /**
   * Создать канал файлов.
   *
   * @param context контекст приложения.
   */
  fun ensureFileChannel(context: Context) {
    ensureChannel(context, CHANNEL_FILES, R.string.channel_files_name, R.string.channel_files_description, NotificationManager.IMPORTANCE_DEFAULT)
  }

  /**
   * Создать канал постоянного уведомления сессии.
   *
   * @param context контекст приложения.
   */
  fun ensureSessionChannel(context: Context) {
    ensureChannel(context, CHANNEL_SESSION, R.string.channel_session_name, R.string.channel_session_description, NotificationManager.IMPORTANCE_LOW) {
      setShowBadge(false)
    }
  }

  /**
   * Постоянное уведомление «сессия открыта».
   *
   * @param context контекст приложения.
   * @return готовое уведомление для startForeground.
   */
  fun sessionNotification(context: Context): Notification =
    base(context, CHANNEL_SESSION, context.getString(R.string.app_name), context.getString(R.string.service_session_text))
      .setContentIntent(openApp(context))
      .setOngoing(true)
      .setShowWhen(false)
      .setVisibility(Notification.VISIBILITY_PRIVATE)
      .build()

  /**
   * Переход в приложение по тапу уведомления.
   *
   * Ведёт в ConnectActivity, а не в SessionActivity без extras: экран сам renew-ит
   * сохранённый device-token или предложит сопряжение. Прямой запуск SessionActivity
   * без параметров раньше завершался finish() и падением в onDestroy.
   *
   * @param context контекст приложения.
   * @return PendingIntent с NEW_TASK/CLEAR_TOP.
   */
  fun openApp(context: Context): PendingIntent =
    PendingIntent.getActivity(
      context,
      0,
      Intent(context, ConnectActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

  /**
   * Конструктор для канала с общей иконкой/видимостью.
   *
   * @param context контекст.
   * @param channel канал.
   * @param title заголовок.
   * @param body текст.
   * @return builder.
   */
  fun base(context: Context, channel: String, title: String, body: String): Notification.Builder =
    Notification.Builder(context, channel)
      .setSmallIcon(R.drawable.ic_stat_task)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(Notification.BigTextStyle().bigText(body))
      .setVisibility(Notification.VISIBILITY_PRIVATE)

  private fun ensureChannel(
    context: Context,
    id: String,
    name: Int,
    description: Int,
    importance: Int,
    extra: NotificationChannel.() -> Unit = {},
  ) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(
      NotificationChannel(id, context.getString(name), importance).apply {
        this.description = context.getString(description)
        extra()
      },
    )
  }
}
