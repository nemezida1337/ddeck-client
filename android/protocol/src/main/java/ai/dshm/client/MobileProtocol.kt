package ai.dshm.client

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.net.URI
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

/**
 * DeepSeek Harness mobile gateway protocol, Android side.
 *
 * Behaviour mirrors the verified reference implementation in
 * `protocol.mjs`; dev-tools compare the two
 * so neither can drift silently. Everything here is dependency-free apart from
 * `org.json`, which Android ships.
 *
 * Two rules the gateway enforces and this client therefore follows everywhere:
 * the `Host` header must equal the public authority, and every mutation must
 * carry an `Origin` naming that same authority. The session cookie is named
 * `dsh_ma_session` over plain HTTP and `__Host-dsh_ma_session` over TLS.
 */
object Protocol {
  /** Discovery document version this client understands. */
  const val DISCOVERY_PROTOCOL = 1

  /** Datagram payload a client broadcasts to find nearby computers. */
  const val DISCOVERY_QUERY = "DSH_MOBILE_DISCOVER_V1"

  /** Prefix of every gateway-owned route. */
  const val AUTH_PREFIX = "/mobile-access"

  /** Session cookie name on a plain-HTTP listener. */
  const val SESSION_COOKIE = "dsh_ma_session"

  /** Session cookie name the gateway prefers once its listener serves TLS. */
  const val HOST_SESSION_COOKIE = "__Host-dsh_ma_session"

  /** Header that must repeat the CSRF token on every mutation. */
  const val CSRF_HEADER = "x-dsh-mobile-csrf"

  /** Route serving the discovery document. */
  const val DISCOVERY_PATH = "$AUTH_PREFIX/discovery"

  /** Route serving discovery metadata. */
  const val METADATA_PATH = "$AUTH_PREFIX/metadata"

  /** Route serving the pinned CA as DER. */
  const val CA_PATH = "$AUTH_PREFIX/ca.cer"

  /** Route exchanging a pairing token for a device credential. */
  const val NATIVE_PAIR_PATH = "$AUTH_PREFIX/auth/native-pair"

  /** Route renewing a session credential from the device credential. */
  const val NATIVE_RENEW_PATH = "$AUTH_PREFIX/auth/native-renew"

  /** Route asking whether a device credential is still valid. */
  const val NATIVE_PROBE_PATH = "$AUTH_PREFIX/auth/native-probe"
}

/** A pairing invite taken from the computer's link or app key. */
data class PairingInvite(
  /** Gateway origin the phone must reach. */
  val origin: String,
  /** One-time pairing token. */
  val token: String,
  /** Instance the computer advertises, used to confirm the pinned CA. */
  val instanceId: String,
  /** Whether the invite demands pinning the computer's CA (`dsh2` form). */
  val requiresPin: Boolean,
)

/**
 * Parse the pairing link a computer shows, or the bare app key it also prints.
 *
 * Two fragment forms exist: a LAN link carries `instance` and `token`, while a
 * remote entry with a self-signed CA carries `key=dsh2.<instanceId>.<token>`. The
 * `dsh2` prefix means the client must pin that CA; a parser that dropped it would
 * silently downgrade trust to the public store, so the flag survives parsing.
 *
 * @param text pasted invite: a pairing URL, or a bare app key when an origin is known.
 * @param originHint origin to use when `text` is a bare app key.
 * @return parsed invite, or null when the text is not a pairing invite.
 */
fun parsePairingLink(text: String, originHint: String? = null): PairingInvite? {
  val trimmed = text.trim()
  if (trimmed.isEmpty()) return null

  fun fromKey(key: String, origin: String): PairingInvite? {
    val parts = key.split('.')
    if (parts.size != 3) return null
    val (version, instanceId, token) = parts
    if (version != "dsh1" && version != "dsh2") return null
    if (!Regex("^[0-9a-f]{64}$").matches(instanceId) || token.isEmpty()) return null
    return PairingInvite(origin, token, instanceId, version == "dsh2")
  }

  if (!Regex("^https?://", RegexOption.IGNORE_CASE).containsMatchIn(trimmed)) {
    val hint = originHint?.trimEnd('/') ?: return null
    return fromKey(trimmed, hint)
  }
  val uri = runCatching { java.net.URI(trimmed) }.getOrNull() ?: return null
  val scheme = uri.scheme?.lowercase() ?: return null
  if (scheme != "https" && scheme != "http") return null
  if (uri.path?.endsWith("/mobile-access/pair") != true) return null
  val origin = buildString {
    append(scheme).append("://").append(uri.host)
    if (uri.port != -1) append(':').append(uri.port)
  }
  val fragment = uri.fragment ?: return null
  val fields = fragment.split('&').mapNotNull { part ->
    val index = part.indexOf('=')
    if (index <= 0) null else part.substring(0, index) to part.substring(index + 1)
  }.toMap()
  fields["key"]?.let { return fromKey(it, origin) }
  val token = fields["token"] ?: return null
  val instanceId = fields["instance"] ?: return null
  if (!Regex("^[0-9a-f]{64}$").matches(instanceId)) return null
  return PairingInvite(origin, token, instanceId, false)
}

/** What a nearby computer answers when asked to identify itself. */
data class Discovery(
  val deviceName: String,
  val origin: String,
  val port: Int,
  val protocol: Int,
  val instanceId: String,
)

/** Credential set issued by pairing; the device token outlives many sessions. */
data class Credential(
  val instanceId: String,
  val deviceId: String,
  val deviceToken: String,
  val deviceExpiresAt: Long,
  val sessionToken: String,
  val csrfToken: String,
  val sessionExpiresAt: Long,
)

/** A gateway refusal carrying the HTTP status so callers can branch on it. */
class GatewayException(val status: Int, val body: String?) : Exception("gateway refused with $status")

/**
 * Client bound to one gateway origin.
 *
 * @param origin gateway origin, for example `https://192.168.1.10:3443`.
 * @param pinnedCa certificate the client trusts instead of the system store; null uses the system store.
 */
class MobileClient(private val origin: String, private val pinnedCa: X509Certificate? = null) {
  private val base = URI(origin.trimEnd('/'))
  private val authority: String = buildString {
    append(base.host)
    if (base.port != -1) append(':').append(base.port)
  }
  private val secure: Boolean = base.scheme.equals("https", ignoreCase = true)
  private val random = SecureRandom()

  /** Device token issued by pairing, or null before pairing. */
  var deviceToken: String? = null
    private set

  /** Short-lived session token used for authenticated calls. */
  var sessionToken: String? = null
    private set

  /** CSRF token that mutations must repeat in [Protocol.CSRF_HEADER]. */
  var csrfToken: String? = null
    private set

  /**
   * Read discovery metadata, including the protocol version the gateway speaks.
   *
   * @return gateway metadata document.
   */
  fun metadata(): JSONObject = JSONObject(request(Protocol.METADATA_PATH))

  /**
   * Read the discovery document.
   *
   * @return discovery document served without authentication.
   */
  fun discover(): Discovery = parseDiscovery(JSONObject(request(Protocol.DISCOVERY_PATH)))

  /**
   * Fetch the gateway's certificate as DER, the pinning anchor.
   *
   * @return DER bytes of the pairing CA.
   */
  fun fetchCaDer(): ByteArray = requestBytes(Protocol.CA_PATH)

  /**
   * Exchange a pairing token for a device credential.
   *
   * @param token one-time pairing token shown on the computer.
   * @param label device name recorded on the computer.
   * @return issued credential set.
   */
  fun pair(token: String, label: String? = null, fingerprint: String? = null): Credential {
    val body = JSONObject().put("token", token)
    if (label != null) body.put("label", label)
    if (fingerprint != null) body.put("fingerprint", fingerprint)
    val credential = parseCredential(JSONObject(request(Protocol.NATIVE_PAIR_PATH, "POST", body.toString())))
    deviceToken = credential.deviceToken
    sessionToken = credential.sessionToken
    csrfToken = credential.csrfToken
    return credential
  }

  /**
   * Fetch the computer's pairing CA before anything is pinned.
   *
   * A LAN gateway serves a self-signed certificate, so the very first request
   * cannot be verified in the usual way. The trust decision is made here instead:
   * the certificate the listener presents is captured, the CA is fetched, and the
   * CA's fingerprint must equal the `instanceId` the invite carried. Only then is
   * that CA worth pinning; a mismatch returns null and pairing must not continue.
   *
   * @param expectedInstanceId instance id from the pairing invite, or null when the address was typed by hand.
   * @return the CA to pin, or null when the listener does not prove the expected identity.
   */
  fun bootstrapCa(expectedInstanceId: String?): X509Certificate? {
    val captured = java.util.concurrent.atomic.AtomicReference<X509Certificate?>()
    val capturing = object : X509TrustManager {
      override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) = Unit
      override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
        captured.set(chain.firstOrNull())
      }
      override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    }
    val context = SSLContext.getInstance("TLS")
    context.init(null, arrayOf<TrustManager>(capturing), SecureRandom())
    val probe = OkHttpClient.Builder()
      .sslSocketFactory(context.socketFactory, capturing)
      .hostnameVerifier { _, _ -> true }
      .connectTimeout(10, TimeUnit.SECONDS)
      .readTimeout(20, TimeUnit.SECONDS)
      .build()
    val der = runCatching {
      probe.newCall(
        Request.Builder().url(origin.trimEnd('/') + Protocol.CA_PATH).header("Host", authority).build(),
      ).execute().use { if (!it.isSuccessful) null else it.body?.bytes() }
    }.getOrNull() ?: return null
    val ca = parseCertificate(der) ?: return null
    if (expectedInstanceId != null && !fingerprint(ca).equals(expectedInstanceId, ignoreCase = true)) return null
    val leaf = captured.get() ?: return ca
    // The listener's own certificate must belong to that CA (or be it).
    if (leaf.publicKey != ca.publicKey && !runCatching { leaf.verify(ca.publicKey) }.isSuccess) return null
    return ca
  }

  /**
   * Adopt a device credential issued earlier, so a paired computer can be
   * reopened without pairing again.
   *
   * @param token device token stored at pairing time.
   */
  fun adoptDeviceToken(token: String) {
    deviceToken = token
  }

  /**
   * Adopt a live session credential, for work that continues an open screen.
   *
   * The shell already holds the session it installed as the WebView cookie; a download
   * started from the page has to speak to the same gateway with the same credential,
   * and re-pairing or renewing would rotate the session out from under the page.
   *
   * @param token session token issued by pairing or renewal.
   * @param csrf CSRF token issued alongside it, or null when the gateway sent none.
   */
  fun adoptSession(token: String, csrf: String?) {
    sessionToken = token
    csrfToken = csrf
  }

  /**
   * Renew the session credential from the stored device token.
   *
   * @return renewed credential set; the device token is unchanged.
   */
  fun renew(): Credential {
    val token = requireNotNull(deviceToken) { "renew requires a device token from pairing" }
    val credential = parseCredential(
      JSONObject(request(Protocol.NATIVE_RENEW_PATH, "POST", JSONObject().put("deviceToken", token).toString())),
    )
    sessionToken = credential.sessionToken
    csrfToken = credential.csrfToken
    return credential
  }

  /**
   * Ask the gateway whether this device credential is still valid.
   *
   * @return device identity and expiry.
   */
  fun probe(): JSONObject {
    val token = requireNotNull(deviceToken) { "probe requires a device token from pairing" }
    return JSONObject(request(Protocol.NATIVE_PROBE_PATH, "POST", JSONObject().put("deviceToken", token).toString()))
  }

  /**
   * Call a proxied harness path as the paired operator.
   *
   * @param path harness path, for example `/api/session/list`.
   * @param method HTTP method; anything but GET/HEAD counts as a mutation.
   * @param body JSON body, or null.
   * @return raw response text.
   */
  fun call(path: String, method: String = "GET", body: String? = null): String =
    request(path, method, body, authenticated = true)

  /**
   * Open a WebSocket channel through the gateway's upgrade proxy.
   *
   * @param path upgrade path the gateway allows, for example `/api/remote.mux`.
   * @return an open text channel.
   */
  fun openWebSocket(path: String): TextChannel {
    val session = requireNotNull(sessionToken) { "pairing or renewal must precede the upgrade" }
    val socket: Socket = if (secure) pinnedSocket() else Socket()
    socket.connect(InetSocketAddress(base.host, port()), 10_000)
    val key = ByteArray(16).also(random::nextBytes)
    val keyBase64 = java.util.Base64.getEncoder().encodeToString(key)
    val handshake = buildString {
      append("GET ").append(path).append(" HTTP/1.1\r\n")
      append("Host: ").append(authority).append("\r\n")
      append("Origin: ").append(origin.trimEnd('/')).append("\r\n")
      append("Connection: Upgrade\r\n")
      append("Upgrade: websocket\r\n")
      append("Sec-WebSocket-Key: ").append(keyBase64).append("\r\n")
      append("Sec-WebSocket-Version: 13\r\n")
      append("Cookie: ").append(if (secure) Protocol.HOST_SESSION_COOKIE else Protocol.SESSION_COOKIE)
        .append('=').append(session).append("\r\n\r\n")
    }
    socket.getOutputStream().write(handshake.toByteArray())
    socket.getOutputStream().flush()
    val status = readHandshakeStatus(socket.getInputStream())
    if (status != 101) {
      socket.close()
      throw GatewayException(status, null)
    }
    return TextChannel(socket)
  }

  /**
   * Send one request, authenticating and signing it when asked.
   *
   * @param path absolute path below the gateway origin.
   * @param method HTTP method.
   * @param body JSON body, or null.
   * @param authenticated whether to attach the session cookie and CSRF header.
   * @return response text.
   */
  fun request(
    path: String,
    method: String = "GET",
    body: String? = null,
    authenticated: Boolean = false,
  ): String = String(requestBytes(path, method, body, authenticated), Charsets.UTF_8)

  /**
   * Send one request and return the raw bytes.
   *
   * @param path absolute path below the gateway origin.
   * @param method HTTP method.
   * @param body JSON body, or null.
   * @param authenticated whether to attach the session cookie and CSRF header.
   * @return response bytes.
   */
  private fun requestBytes(
    path: String,
    method: String = "GET",
    body: String? = null,
    authenticated: Boolean = false,
  ): ByteArray {
    val mutation = method != "GET" && method != "HEAD"
    val builder = Request.Builder()
      .url(origin.trimEnd('/') + path)
      .header("Host", authority)
      .header("Accept", "application/json")
    // The gateway refuses every mutation whose Origin does not name the public
    // authority. java.net.HttpURLConnection silently drops this header as
    // restricted, which is why the transport is OkHttp: a dropped Origin is a
    // 403 that looks like an authentication failure.
    if (mutation) builder.header("Origin", origin.trimEnd('/'))
    if (authenticated) {
      sessionToken?.let {
        builder.header("Cookie", "${if (secure) Protocol.HOST_SESSION_COOKIE else Protocol.SESSION_COOKIE}=$it")
      }
      if (mutation) csrfToken?.let { builder.header(Protocol.CSRF_HEADER, it) }
    }
    val requestBody = when {
      body != null -> body.toRequestBody("application/json".toMediaType())
      mutation -> ByteArray(0).toRequestBody(null)
      else -> null
    }
    val response = httpClient.newCall(builder.method(method, requestBody).build()).execute()
    response.use {
      val bytes = it.body?.bytes() ?: ByteArray(0)
      lastStatus = it.code
      if (!it.isSuccessful) throw GatewayException(it.code, bytes.toString(Charsets.UTF_8))
      return bytes
    }
  }

  /**
   * Stream one authenticated response into a sink.
   *
   * Needed because downloads cannot go through the platform downloader: the gateway's
   * certificate is signed by the pairing CA, which only this client trusts, so
   * `DownloadManager` fails the handshake before the request is even sent (measured on
   * the device: `ssl_verify_result=20`). The same pinned stack that reads the interface
   * reads its exports.
   *
   * The body is copied in chunks rather than buffered: a session export is a ZIP of a
   * whole conversation and has no business being held in memory first.
   *
   * @param path absolute path below the gateway origin.
   * @param sink destination; not closed here, the caller owns it.
   * @return number of bytes copied.
   */
  fun downloadTo(path: String, sink: java.io.OutputStream): Long {
    val builder = Request.Builder()
      .url(origin.trimEnd('/') + path)
      .header("Host", authority)
      .header("Accept", "*/*")
    sessionToken?.let {
      builder.header("Cookie", "${if (secure) Protocol.HOST_SESSION_COOKIE else Protocol.SESSION_COOKIE}=$it")
    }
    httpClient.newCall(builder.get().build()).execute().use { response ->
      lastStatus = response.code
      if (!response.isSuccessful) {
        throw GatewayException(response.code, response.body?.string().orEmpty())
      }
      val body = response.body ?: throw GatewayException(response.code, "empty response body")
      return body.byteStream().use { source -> source.copyTo(sink) }
    }
  }

  /** Status of the most recent response, including a refusal; 0 before the first request. */
  var lastStatus: Int = 0
    private set

  /** Shared HTTP client; pinning is applied when a certificate was supplied. */
  private val httpClient: OkHttpClient by lazy {
    OkHttpClient.Builder()
      .connectTimeout(10, TimeUnit.SECONDS)
      .readTimeout(20, TimeUnit.SECONDS)
      .apply {
        if (pinnedCa != null) sslSocketFactory(pinnedSocketFactory(), pinnedTrustManager())
      }
      .build()
  }

  /** @return the effective port, defaulting by scheme. */
  private fun port(): Int = if (base.port != -1) base.port else if (secure) 443 else 80

  /** @return a trust manager that accepts only the pinned certificate's chain. */
  private fun pinnedTrustManager(): X509TrustManager = object : X509TrustManager {
    override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) = Unit
    override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
      val leaf = chain.firstOrNull() ?: throw java.security.cert.CertificateException("empty chain")
      leaf.verify(requireNotNull(pinnedCa).publicKey)
    }
    override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf(requireNotNull(pinnedCa))
  }

  /** @return an SSL socket factory that trusts only the pinned certificate. */
  private fun pinnedSocketFactory(): javax.net.ssl.SSLSocketFactory {
    val context = SSLContext.getInstance("TLS")
    context.init(null, arrayOf<TrustManager>(pinnedTrustManager()), SecureRandom())
    return context.socketFactory
  }

  /** @return a TLS socket whose handshake uses the pinned trust manager. */
  private fun pinnedSocket(): Socket {
    val socket = pinnedSocketFactory().createSocket() as SSLSocket
    socket.enabledProtocols = socket.supportedProtocols
    return socket
  }

  /** @return the raw certificate pin, for callers that manage their own TLS. */
  fun pinnedCertificate(): X509Certificate? = pinnedCa

  /**
   * @param json discovery document.
   * @return parsed discovery record.
   */
  private fun parseDiscovery(json: JSONObject): Discovery = Discovery(
    deviceName = json.getString("deviceName"),
    origin = json.getString("origin"),
    port = json.getInt("port"),
    protocol = json.getInt("protocol"),
    instanceId = json.getString("instanceId"),
  )

  /**
   * @param json pairing or renewal response.
   * @return parsed credential set, filling renewal blanks from the current state.
   */
  private fun parseCredential(json: JSONObject): Credential = Credential(
    instanceId = json.optString("instanceId", ""),
    deviceId = json.getString("deviceId"),
    deviceToken = json.optString("deviceToken", deviceToken ?: ""),
    deviceExpiresAt = json.optLong("deviceExpiresAt", 0L),
    sessionToken = json.getString("sessionToken"),
    csrfToken = json.getString("csrfToken"),
    sessionExpiresAt = json.optLong("sessionExpiresAt", 0L),
  )

  /**
 * @param encoded DER bytes of a certificate.
 * @return parsed certificate, or null when the bytes are not one.
 */
private fun parseCertificate(encoded: ByteArray): X509Certificate? = runCatching {
  java.security.cert.CertificateFactory.getInstance("X.509")
    .generateCertificate(encoded.inputStream()) as X509Certificate
}.getOrNull()

/** @return the SHA-256 fingerprint of a certificate, the gateway's `instanceId` form. */
  companion object {
    /**
     * @param certificate certificate to fingerprint.
     * @return lowercase hex SHA-256 without separators.
     */
    fun fingerprint(certificate: X509Certificate): String =
      MessageDigest.getInstance("SHA-256").digest(certificate.encoded)
        .joinToString("") { "%02x".format(it) }

    /**
     * @param json discovery document received over UDP.
     * @return parsed discovery record.
     */
    fun parseDiscovery(json: JSONObject): Discovery = Discovery(
      deviceName = json.getString("deviceName"),
      origin = json.getString("origin"),
      port = json.getInt("port"),
      protocol = json.getInt("protocol"),
      instanceId = json.getString("instanceId"),
    )

    /**
     * Ask one known origin who it is.
     *
     * @param origin gateway origin to question.
     * @return discovery document.
     */
    fun discoverViaHttp(origin: String): Discovery = MobileClient(origin).discover()

    /**
     * Broadcast the discovery query and wait for the first announcement.
     *
     * @param address broadcast address, for example `192.168.1.255`.
     * @param port the gateway's own port.
     * @param timeoutMs how long to wait before giving up.
     * @return the first announcement, or null when nothing answers in time.
     */
    fun discoverViaBroadcast(address: String, port: Int, timeoutMs: Int = 3000): Discovery? {
      DatagramSocket().use { socket ->
        socket.soTimeout = timeoutMs
        val query = Protocol.DISCOVERY_QUERY.toByteArray(Charsets.US_ASCII)
        socket.send(DatagramPacket(query, query.size, InetAddress.getByName(address), port))
        val buffer = ByteArray(4096)
        val answer = DatagramPacket(buffer, buffer.size)
        return try {
          socket.receive(answer)
          parseDiscovery(JSONObject(String(buffer, 0, answer.length, Charsets.UTF_8)))
        } catch (timeout: java.net.SocketTimeoutException) {
          null
        }
      }
    }
  }
}

/**
 * Minimal RFC 6455 text channel: masked client frames out, text frames in.
 *
 * @param socket upgraded socket owned by this channel.
 */
class TextChannel(private val socket: Socket) {
  private val random = SecureRandom()

  /** @return whether the underlying socket is still open. */
  val open: Boolean get() = !socket.isClosed

  /**
   * Send one masked text frame.
   *
   * @param text payload to send.
   */
  fun send(text: String) {
    val payload = text.toByteArray(Charsets.UTF_8)
    val mask = ByteArray(4).also(random::nextBytes)
    val header = ByteArrayOutputStream()
    header.write(0x81)
    when {
      payload.size < 126 -> header.write(0x80 or payload.size)
      payload.size < 65536 -> {
        header.write(0x80 or 126)
        header.write(payload.size ushr 8)
        header.write(payload.size and 0xff)
      }
      else -> {
        header.write(0x80 or 127)
        for (shift in 56 downTo 0 step 8) header.write(((payload.size.toLong() ushr shift) and 0xff).toInt())
      }
    }
    header.write(mask)
    val masked = ByteArray(payload.size) { index -> (payload[index].toInt() xor mask[index % 4].toInt()).toByte() }
    header.write(masked)
    socket.getOutputStream().write(header.toByteArray())
    socket.getOutputStream().flush()
  }

  /**
   * Wait for the next text frame.
   *
   * @param timeoutMs maximum wait before failing.
   * @return the next text payload.
   */
  fun next(timeoutMs: Int = 5000): String {
    socket.soTimeout = timeoutMs
    val input = socket.getInputStream()
    while (true) {
      val first = input.read()
      if (first < 0) throw java.io.EOFException("channel closed")
      val second = input.read()
      val opcode = first and 0x0f
      val masked = (second and 0x80) != 0
      var length = second and 0x7f
      if (length == 126) length = (input.read() shl 8) or input.read()
      else if (length == 127) {
        var value = 0L
        repeat(8) { value = (value shl 8) or input.read().toLong() }
        length = value.toInt()
      }
      val mask = if (masked) readExactly(input, 4) else null
      val payload = readExactly(input, length)
      if (mask != null) for (index in payload.indices) {
        payload[index] = (payload[index].toInt() xor mask[index % 4].toInt()).toByte()
      }
      when (opcode) {
        0x8 -> throw java.io.EOFException("channel closed by peer")
        0x1 -> return String(payload, Charsets.UTF_8)
        else -> Unit
      }
    }
  }

  /** Close the channel. */
  fun close() = socket.close()

  /**
   * @param input stream to read.
   * @param count exact number of bytes to read.
   * @return the bytes read.
   */
  private fun readExactly(input: InputStream, count: Int): ByteArray {
    val bytes = ByteArray(count)
    var offset = 0
    while (offset < count) {
      val read = input.read(bytes, offset, count - offset)
      if (read < 0) throw java.io.EOFException("channel closed mid-frame")
      offset += read
    }
    return bytes
  }
}

/**
 * @param input stream to drain.
 * @return every byte the stream produced.
 */
private fun readAll(input: InputStream): ByteArray {
  val buffer = ByteArrayOutputStream()
  val chunk = ByteArray(8192)
  while (true) {
    val read = input.read(chunk)
    if (read < 0) return buffer.toByteArray()
    buffer.write(chunk, 0, read)
  }
}

/**
 * @param input upgraded stream positioned at the response line.
 * @return the HTTP status code of the upgrade response.
 */
internal fun readHandshakeStatus(input: InputStream): Int {
  var status = 0
  var line = StringBuilder()
  var lines = 0
  while (true) {
    val byte = input.read()
    if (byte < 0) throw java.io.EOFException("handshake closed")
    if (byte == '\n'.code) {
      lines += 1
      val text = line.toString().trimEnd('\r')
      if (text.isEmpty()) break               // пустая строка — конец заголовков
      if (status == 0) status = text.split(' ').getOrNull(1)?.toIntOrNull() ?: 0
      line = StringBuilder()
      if (lines > 200) throw IllegalArgumentException("handshake headers too large")
      continue
    }
    line.append(byte.toChar())
  }
  return status
}
