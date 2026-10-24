package ai.dshm.client.app

import android.content.Context
import android.provider.Settings
import java.security.MessageDigest

/**
 * Стабильный отпечаток телефона для сопряжения.
 *
 * MAC-адрес с Android 6 недоступен приложениям (и с 10 рандомизируется), поэтому
 * опознаём установку по связке «ANDROID_ID приложения + Build.FINGERPRINT + модель +
 * пакет». Отпечаток не выходит за пределы шлюза, хранится как SHA-256 и служит только
 * для того, чтобы повторное сопряжение того же телефона переиспользовало запись, а не
 * добавляло ещё одну.
 */
object DeviceIdentity {
  /**
   * @param context контекст приложения.
   * @return 64-символьный hex SHA-256, стабильный для этой установки.
   */
  fun fingerprint(context: Context): String {
    val androidId = runCatching {
      Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
    }.getOrNull().orEmpty()
    val material = listOf(
      androidId,
      android.os.Build.FINGERPRINT,
      android.os.Build.MODEL,
      android.os.Build.MANUFACTURER,
    ).joinToString("|")
    return MessageDigest.getInstance("SHA-256")
      .digest(material.toByteArray(Charsets.UTF_8))
      .joinToString("") { byte -> "%02x".format(byte) }
  }
}
