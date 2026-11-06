package ai.dshm.client.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

/**
 * Checks GitHub Releases for a newer beta and offers to open its page.
 *
 * The check never blocks the UI, sends no identifiers, and is cached for 12 hours
 * so the phone does not poll GitHub on every launch. The APK is not downloaded
 * silently: the person decides whether to open the release page.
 */
class UpdateChecker(private val activity: Activity) {
  private val preferences = activity.getSharedPreferences("dshm_updates", Activity.MODE_PRIVATE)

  /**
   * Check GitHub Releases for a newer beta.
   *
   * This is a courtesy check: no identifiers are sent, failures are silent, and
   * the result is cached so a phone does not poll GitHub on every launch. The
   * release page is opened in the browser; the APK is not downloaded silently.
   */
  fun check() {
    val now = System.currentTimeMillis()
    if (now - preferences.getLong("lastCheck", 0L) < 12L * 60L * 60L * 1000L) return
    Thread {
      val update = runCatching { fetchUpdate() }.getOrNull()
      // Cache even a "no update" answer; otherwise the next launch would call
      // GitHub again. A failed request is cached too, so a phone without network
      // does not retry on every activity recreation.
      preferences.edit().putLong("lastCheck", now).apply()
      if (update == null) return@Thread
      activity.runOnUiThread {
        if (activity.isFinishing || activity.isDestroyed) return@runOnUiThread
        AlertDialog.Builder(activity)
          .setTitle(R.string.update_title)
          .setMessage(activity.getString(R.string.update_message, update.tag, BuildConfig.VERSION_NAME))
          .setPositiveButton(R.string.update_open) { _, _ ->
            runCatching {
              activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(update.url)))
            }.onFailure {
              android.widget.Toast.makeText(activity, R.string.connect_no_browser, android.widget.Toast.LENGTH_SHORT).show()
            }
          }
          .setNegativeButton(R.string.update_later, null)
          .show()
      }
    }.start()
  }

  /** @return newest published release if it is newer than this build. */
  private fun fetchUpdate(): ReleaseInfo? {
    val connection = URL("https://api.github.com/repos/nemezida1337/ddeck-client/releases?per_page=20")
      .openConnection() as HttpURLConnection
    connection.connectTimeout = 5000
    connection.readTimeout = 5000
    connection.setRequestProperty("Accept", "application/vnd.github+json")
    connection.setRequestProperty("User-Agent", "DDeck/${BuildConfig.VERSION_NAME}")
    try {
      if (connection.responseCode != 200) return null
      val array = JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
      val current = parseVersion(BuildConfig.VERSION_NAME) ?: return null
      var newest: ReleaseInfo? = null
      for (index in 0 until array.length()) {
        val item = array.getJSONObject(index)
        if (item.optBoolean("draft", false)) continue
        val tag = item.optString("tag_name")
        val version = parseVersion(tag) ?: continue
        if (!isNewer(version, current)) continue
        val url = item.optString("html_url")
        if (url.isEmpty()) continue
        if (newest === null || isNewer(version, parseVersion(newest.tag) ?: current)) {
          newest = ReleaseInfo(tag, url)
        }
      }
      return newest
    } finally {
      connection.disconnect()
    }
  }

  private data class ReleaseInfo(val tag: String, val url: String)
  private data class Version(val parts: List<Int>, val prerelease: String?)

  private fun parseVersion(raw: String): Version? {
    val match = Regex("^[vV]?(\\d+)\\.(\\d+)\\.(\\d+)(?:-([0-9A-Za-z.-]+))?$").matchEntire(raw.trim()) ?: return null
    return Version(listOf(match.groupValues[1].toInt(), match.groupValues[2].toInt(), match.groupValues[3].toInt()), match.groupValues[4].ifEmpty { null })
  }

  private fun isNewer(candidate: Version, current: Version): Boolean {
    for (index in 0..2) {
      if (candidate.parts[index] != current.parts[index]) return candidate.parts[index] > current.parts[index]
    }
    // Stable beats a prerelease; between prereleases, compare identifiers.
    if (candidate.prerelease == null) return current.prerelease != null
    if (current.prerelease == null) return false
    return comparePrerelease(candidate.prerelease, current.prerelease) > 0
  }

  /** Semver prerelease comparison: numeric identifiers win over textual ones. */
  private fun comparePrerelease(candidate: String, current: String): Int {
    val left = candidate.split('.')
    val right = current.split('.')
    for (index in 0 until minOf(left.size, right.size)) {
      val a = left[index].toIntOrNull()
      val b = right[index].toIntOrNull()
      if (a != null && b != null) {
        if (a != b) return a.compareTo(b)
      } else if (a == null && b == null) {
        val order = left[index].compareTo(right[index], ignoreCase = true)
        if (order != 0) return order
      } else {
        return if (a != null) -1 else 1
      }
    }
    return left.size.compareTo(right.size)
  }

}
