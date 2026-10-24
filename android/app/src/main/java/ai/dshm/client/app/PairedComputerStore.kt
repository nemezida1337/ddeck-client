package ai.dshm.client.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** One computer this phone is paired with. */
data class PairedComputer(
  /** Gateway origin, for example `https://100.x.y.z:3449`. */
  val origin: String,
  /** Human-readable name the computer reported. */
  val label: String,
  /** Long-lived device credential; grants full control of that computer. */
  val deviceToken: String,
  /** Pinned CA in PEM form, or null when the origin uses a publicly trusted certificate. */
  val caPem: String?,
)

/**
 * Stores paired computers on the device, encrypted with a Keystore-backed key.
 *
 * The device credential grants full control of a computer running DeepSeek
 * Harness, so it does not belong in readable preferences. The record is encrypted
 * with AES-256-GCM under a key that lives in the Android Keystore and never leaves
 * it: the app stores only the ciphertext, and a copied preferences file is useless
 * on another device.
 *
 * Deliberate choices:
 * - **No new dependency.** `androidx.security:security-crypto`
 *   (`EncryptedSharedPreferences`) is deprecated, and this job is a key, a cipher
 *   and a blob: sixty lines that can be read in one sitting are safer here than a
 *   deprecated library guarding a credential this powerful.
 * - **No user-authentication requirement on the key.** Requiring a fingerprint
 *   would break the flow that matters (open the app, see your session), and the
 *   threat this defends against is a copied file, not someone holding the unlocked
 *   phone.
 * - **Fails closed, loudly.** An unreadable store yields an empty list and a log
 *   line, never an exception that kills the screen; the person then pairs again.
 * - **Migrates the old plaintext.** Records written before this change are read
 *   once, re-encrypted, and the plaintext copy is removed only after the encrypted
 *   write succeeded.
 *
 * @param context application context used to reach preferences and the Keystore.
 */
class PairedComputerStore(context: Context) {
  private val preferences = context.getSharedPreferences("dshm_paired_computers", Context.MODE_PRIVATE)

  /**
   * Read every paired computer, oldest first.
   *
   * @return stored records; an unreadable store yields an empty list rather than a crash.
   */
  fun list(): List<PairedComputer> {
    val stored = preferences.getString(KEY_CIPHERTEXT, null)
    if (stored != null) {
      val plaintext = decrypt(stored)
      if (plaintext != null) {
        // Шифртекст читается: legacy-копию (если осталась после сбоя) убираем
        // синхронно, чтобы device-token не лежал открытым «на всякий случай».
        if (preferences.contains(KEY_LEGACY) && preferences.edit().remove(KEY_LEGACY).commit()) {
          android.util.Log.i("dshm", "removed leftover plaintext credential copy")
        }
        return parse(plaintext)
      }
      // Ключ недоступен/повреждён: не теряем данные — пробуем legacy-запись.
      android.util.Log.w("dshm", "encrypted credential store is unreadable; trying plaintext fallback")
    }
    // Nothing encrypted (or it is unreadable): either a fresh install or a record
    // written by an older build. Only the second case has anything to migrate.
    val legacy = preferences.getString(KEY_LEGACY, null) ?: return emptyList()
    val computers = parse(legacy)
    if (computers.isEmpty()) return emptyList()
    write(computers, synchronously = true)
    // Removed only now, so a failed encryption cannot destroy the only copy.
    if (preferences.contains(KEY_CIPHERTEXT)) {
      if (!preferences.edit().remove(KEY_LEGACY).commit()) {
        android.util.Log.w("dshm", "plaintext credential copy removal deferred")
      } else {
        android.util.Log.i("dshm", "credential store migrated to Keystore: ${computers.size} record(s)")
      }
    }
    return computers
  }

  /**
   * Add or replace a computer, keeping the list small.
   *
   * @param computer record to store.
   * @return the stored list after the change.
   */
  fun save(computer: PairedComputer): List<PairedComputer> {
    val updated = (list().filterNot { it.origin == computer.origin } + computer).takeLast(MAX_COMPUTERS)
    write(updated)
    return updated
  }

  /**
   * @return the computer used most recently, or null when none is stored.
   */
  fun mostRecent(): PairedComputer? = list().lastOrNull()

  /**
   * Mark a computer as the most recently used one.
   *
   * The store keeps records in use order, so "recent" needs no second preference:
   * the record is re-saved, which moves it to the end of the list. Nothing is
   * written when the record is unknown or already last.
   *
   * @param origin origin of the record that was just used.
   */
  fun touch(origin: String) {
    val computers = list()
    val record = computers.lastOrNull() ?: return
    if (record.origin == origin) return
    val moved = computers.firstOrNull { it.origin == origin } ?: return
    write(computers.filterNot { it.origin == origin } + moved)
  }

  /**
   * Forget one computer on this device.
   *
   * Removing a local record does not revoke the credential on the computer; pair
   * again, or revoke the device there.
   *
   * @param origin origin of the record to drop.
   * @return the stored list after the change.
   */
  fun forget(origin: String): List<PairedComputer> {
    val updated = list().filterNot { it.origin == origin }
    write(updated)
    return updated
  }

  /**
   * @param raw stored JSON to parse.
   * @return records, or an empty list when the payload is not readable.
   */
  private fun parse(raw: String): List<PairedComputer> = runCatching {
    val array = JSONArray(raw)
    (0 until array.length()).map { index ->
      val entry = array.getJSONObject(index)
      PairedComputer(
        origin = entry.getString("origin"),
        label = entry.getString("label"),
        deviceToken = entry.getString("deviceToken"),
        caPem = if (entry.isNull("caPem")) null else entry.getString("caPem"),
      )
    }
  }.getOrElse { failure ->
    android.util.Log.w("dshm", "credential store is unreadable: ${failure.message}")
    emptyList()
  }

  /**
   * @param computers records to persist, encrypted.
   * @param synchronously whether the caller must know the bytes reached the disk
   *   before it continues. Only the migration needs that: it deletes the plaintext
   *   copy afterwards, and a crash between the two writes must not lose the record.
   *   Every other save returns immediately and hits the disk in the background, so
   *   pairing never blocks the screen on a file write.
   */
  private fun write(computers: List<PairedComputer>, synchronously: Boolean = false) {
    val array = JSONArray()
    for (computer in computers) {
      array.put(
        JSONObject()
          .put("origin", computer.origin)
          .put("label", computer.label)
          .put("deviceToken", computer.deviceToken)
          .put("caPem", computer.caPem ?: JSONObject.NULL),
      )
    }
    val sealed = encrypt(array.toString())
    if (sealed == null) {
      // Without a usable key the honest outcome is to write nothing: keeping the
      // credential in the clear "for now" is exactly what this class exists to stop.
      android.util.Log.e("dshm", "credential store not written: Keystore key unavailable")
      return
    }
    val edit = preferences.edit().putString(KEY_CIPHERTEXT, sealed)
    if (!synchronously) {
      edit.apply()
      return
    }
    if (!edit.commit()) {
      android.util.Log.e("dshm", "credential store not written: preferences commit failed")
    }
  }

  /**
   * @param plaintext record list as JSON.
   * @return `base64(version || iv || ciphertext)`, or null when encryption is impossible.
   */
  private fun encrypt(plaintext: String): String? = runCatching {
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, secretKey())
    val sealed = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
    Base64.encodeToString(byteArrayOf(FORMAT_VERSION) + cipher.iv + sealed, Base64.NO_WRAP)
  }.getOrElse { failure ->
    android.util.Log.e("dshm", "credential store encryption failed: ${failure.message}")
    null
  }

  /**
   * @param stored value produced by [encrypt].
   * @return decrypted JSON, or null when the payload cannot be authenticated.
   */
  private fun decrypt(stored: String): String? = runCatching {
    val bytes = Base64.decode(stored, Base64.NO_WRAP)
    require(bytes.size > 1 + IV_BYTES && bytes[0] == FORMAT_VERSION) { "unexpected credential store format" }
    val iv = bytes.copyOfRange(1, 1 + IV_BYTES)
    val ciphertext = bytes.copyOfRange(1 + IV_BYTES, bytes.size)
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(TAG_BITS, iv))
    String(cipher.doFinal(ciphertext), Charsets.UTF_8)
  }.getOrElse { failure ->
    // A wrong tag means the file was edited or the key was replaced: there is
    // nothing to recover, so the store reports itself empty and pairing is redone.
    android.util.Log.w("dshm", "credential store cannot be decrypted: ${failure.message}")
    null
  }

  /**
   * @return the Keystore entry for this store, created on first use.
   */
  private fun secretKey(): SecretKey {
    val keyStore = KeyStore.getInstance(PROVIDER).apply { load(null) }
    (keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, PROVIDER)
    generator.init(
      KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(KEY_BITS)
        // A fresh IV per write is generated by the provider; letting the caller
        // supply one would invite reuse, which GCM does not survive.
        .setRandomizedEncryptionRequired(true)
        .build(),
    )
    return generator.generateKey()
  }

  private companion object {
    const val PROVIDER = "AndroidKeyStore"
    const val KEY_ALIAS = "dshm_paired_computers_v1"
    const val TRANSFORMATION = "AES/GCM/NoPadding"
    const val KEY_BITS = 256
    const val TAG_BITS = 128
    const val IV_BYTES = 12
    const val FORMAT_VERSION: Byte = 1

    /** Encrypted record list. */
    const val KEY_CIPHERTEXT = "computers.v1"

    /** Plaintext key used before the store moved into the Keystore: read once, then removed. */
    const val KEY_LEGACY = "computers"

    /** How many computers the phone remembers. */
    const val MAX_COMPUTERS = 8
  }
}
