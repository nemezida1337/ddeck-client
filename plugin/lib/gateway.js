/**
 * DDeck — the gateway.
 *
 * The transport — TLS listener, pairing handshake, device registry, HTTP and WebSocket
 * proxying — is vendored from `dsh-mobile` (Apache-2.0) into `vendor/gateway/` and
 * compiled into `gateway-bundle.js`; the `dsh-mobile` package itself is not installed.
 * What we own is everything the person touches: the pairing page, the code, the mobile
 * page, the app, and the Tailscale-aware origin list.
 *
 * @module dsh-remote/gateway
 */

import { randomInt } from 'node:crypto'
import { networkInterfaces, homedir } from 'node:os'
import { join } from 'node:path'
import { ensureCertificates } from './tls.js'
// The gateway is vendored from dsh-mobile and bundled into one module. Importing the
// package directly does not work: it is built as a plugin entry point, so its peer
// dependencies are supplied by the DSH loader only for entries it loads itself.
import { JsonDeviceStore, MobileAccessGateway, parseGatewayConfig } from './gateway-bundle.js'
import { PAIRING_TTL_MS } from './constants.js'

/**
 * Default port the phone dials.
 *
 * The product listener shares the port with the DSH web server, so 3449 is the
 * number a person sees in the pair code; `DSH_REMOTE_PORT` overrides it.
 */
export const DEFAULT_PORT = 3449

/**
 * Address on the local network that a phone can reach.
 *
 * The page is opened on the computer, so its own idea of "where am I" is loopback. A
 * phone needs the machine's address on the Wi-Fi, and that is what pairing should carry.
 *
 * @returns {string | undefined} `192.168.x.y` and similar, or undefined when nothing local
 *   was found (a machine on a VPN-only network, for instance).
 */
export function lanAddress() {
  const preferred = []
  const others = []
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (name === 'lo0' || name.startsWith('utun') || name.startsWith('bridge')) continue
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue
      const [a, b] = address.address.split('.').map(Number)
      const isPrivate = a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      if (isPrivate) preferred.push(address.address)
      else others.push(address.address)
    }
  }
  return preferred[0] ?? others[0]
}

/**
 * Address of this machine in a Tailscale tailnet.
 *
 * Tailscale hands out `100.64.0.0/10` on a `utun` interface — the very interface the
 * LAN probe above skips. Without this the gateway would advertise a private LAN
 * address that no phone outside the house can reach.
 *
 * @returns {string | undefined} `100.x.y.z`, or undefined when Tailscale is off.
 */
export function tailscaleAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue
      const [a, b] = address.address.split('.').map(Number)
      if (a === 100 && b >= 64 && b <= 127) return address.address
    }
  }
  return undefined
}

/**
 * Origins a phone can use, most useful first.
 *
 * A tailnet address works from any network, so it becomes the primary origin (and the
 * QR code); the LAN address is kept as a second authority so a phone in the house does
 * not need Tailscale. When neither exists the caller may still pass an explicit
 * origin; there is simply nothing to guess.
 *
 * @param {number} port - gateway port.
 * @returns {string[]} origins such as `["https://100.64.0.1:3449", "https://192.168.1.10:3449"]`.
 */
export function autoOrigins(port) {
  const origins = []
  const tailscale = tailscaleAddress()
  if (tailscale !== undefined) origins.push(`https://${tailscale}:${String(port)}`)
  const lan = lanAddress()
  if (lan !== undefined && lan !== tailscale) origins.push(`https://${lan}:${String(port)}`)
  return origins
}

/**
 * Normalize one configured origin.
 *
 * The product listens with HTTPS only, and every origin must name the same port as the
 * listener: a phone dials exactly what the QR carries, so a mismatch would be a
 * certificate/Host error the person cannot act on.
 *
 * @param {string} value - URL such as `https://100.64.0.1:3449`.
 * @param {number} port - gateway listen port.
 * @returns {string} normalized origin without a trailing slash.
 */
function normalizeOrigin(value, port) {
  const text = String(value).trim()
  let url
  try {
    url = new URL(text)
  } catch {
    throw new Error(`dsh-remote: неверный origin "${text}"; нужен абсолютный https-адрес`)
  }
  if (url.protocol !== 'https:') {
    throw new Error(`dsh-remote: origin "${text}" должен быть https:// (HTTP запрещён манифестом телефона)`)
  }
  if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== ''
    || (url.pathname !== '' && url.pathname !== '/')) {
    throw new Error(`dsh-remote: origin "${text}" не должен содержать путь, учётные данные, query или fragment`)
  }
  if (url.port !== '' && Number(url.port) !== port) {
    throw new Error(`dsh-remote: порт origin "${text}" не совпадает с портом шлюза ${String(port)}`)
  }
  return `https://${url.hostname.includes(':') ? `[${url.hostname.replaceAll('[', '').replaceAll(']', '')}]` : url.hostname}:${String(port)}`
}

/**
 * Resolve the origin list from an explicit list, a single origin, or an auto-probe.
 *
 * @param {{ origins?: string[], publicOrigin?: string, port: number }} input - caller's intent.
 * @returns {string[]} non-empty unique origins, primary first.
 */
function resolveOrigins({ origins, publicOrigin, port }) {
  const raw = origins !== undefined && origins.length > 0
    ? origins
    : (publicOrigin === undefined ? autoOrigins(port) : [publicOrigin])
  const list = [...new Set(raw.map((origin) => normalizeOrigin(origin, port)))]
  if (list.length === 0) {
    throw new Error('dsh-remote: не удалось определить адрес компьютера; задайте DSH_REMOTE_ORIGINS')
  }
  return list
}

/**
 * Build the gateway configuration.
 *
 * @param {object} options
 * @param {number} options.upstreamPort - loopback port of the DeepSeek Harness server.
 * @param {string} options.stateDirectory - where devices and TLS state live.
 * @param {number} [options.port] - port the phone dials.
 * @param {string[]} [options.origins] - origins the phone may use; the first one is primary.
 * @param {string} [options.publicOrigin] - single-origin compatibility form.
 * @param {string} [options.instanceId] - stable identity of this installation.
 * @param {{ caFile: string, certFile: string, keyFile: string }} [options.tls] - certificates.
 * @returns {object} frozen gateway configuration for `MobileAccessGateway`.
 */
export function gatewayConfig({
  upstreamPort,
  stateDirectory,
  port = DEFAULT_PORT,
  origins,
  publicOrigin,
  instanceId,
  tls,
}) {
  const resolved = resolveOrigins({ origins, publicOrigin, port })
  const hosts = [...new Set(resolved.map((origin) => new URL(origin).hostname))]
  return parseGatewayConfig({
    listenHost: '0.0.0.0',
    listenPort: port,
    // The harness answers on loopback; the gateway is the only door to the network.
    upstreamOrigin: `http://127.0.0.1:${String(upstreamPort)}`,
    publicAuthorities: hosts.map((host) => `${host}:${String(port)}`),
    // 100.64.0.0/10 is Tailscale's address range: without it the gateway rejects a
    // tailnet phone with 403 even though the TLS listener accepts the connection.
    allowedCidrs: ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '100.64.0.0/10'],
    // HTTPS is mandatory: the phone's manifest forbids cleartext, so an HTTP listener
    // would be a door nobody can open.
    tls: tls === undefined
      ? { mode: 'provided' }
      : { mode: 'provided', certFile: tls.certFile, keyFile: tls.keyFile },
    stateFile: join(stateDirectory, 'devices.json'),
    // The panel says five minutes; the gateway used two, so a person reading the code
    // aloud could be beaten by a refresh. Keep the promise in one place.
    pairingTtlMs: PAIRING_TTL_MS,
    // Broadcast and mDNS discovery only matter to a client that listens for them; ours
    // learns the address from the QR code. Turning it off also keeps the gateway from
    // opening a UDP socket on networks where that is unwelcome.
    discovery: false,
    ...(tls === undefined ? {} : { pairingCaFile: tls.caFile }),
    ...(instanceId === undefined ? {} : { instanceId }),
  })
}

/**
 * Start the gateway and return a handle that can close it.
 *
 * @param {object} options
 * @param {number} options.upstreamPort
 * @param {string} options.stateDirectory
 * @param {number} [options.port]
 * @param {string[]} [options.origins] - origins the phone may use; the first one is primary.
 * @param {string} [options.publicOrigin] - single-origin compatibility form.
 * @param {string} [options.instanceId]
 * @param {string} [options.upstreamLoginUrl] - launch-token URL for the upstream harness.
 * @param {(message: string) => void} [options.onWarning] - receives degraded-discovery notes.
 * @returns {Promise<{ gateway: object, config: object, origin: string, origins: string[], close: () => Promise<void> }>}
 */
export async function startGateway({
  upstreamPort,
  stateDirectory,
  port = DEFAULT_PORT,
  origins,
  publicOrigin,
  instanceId,
  upstreamLoginUrl,
  onWarning,
}) {
  const resolved = resolveOrigins({ origins, publicOrigin, port })
  const hosts = [...new Set(resolved.map((origin) => new URL(origin).hostname))]
  // One leaf covers every origin; the CA stays the same, so phones keep their pin.
  const tls = await ensureCertificates(stateDirectory, hosts.join(','))
  const config = gatewayConfig({
    upstreamPort,
    stateDirectory,
    port,
    origins: resolved,
    instanceId: tls.instanceId,
    tls,
  })
  const store = new JsonDeviceStore(config.stateFile, config.maxDevices)
  const gateway = new MobileAccessGateway(
    config,
    store,
    undefined,
    upstreamLoginUrl,
    undefined,
    undefined,
    (source, code) => onWarning?.(`${source}: ${code}`),
  )
  await gateway.start()
  return {
    gateway,
    config,
    origin: resolved[0],
    origins: resolved,
    close: async () => { await gateway.close() },
  }
}

/**
 * Open a pairing window that a person can read out loud.
 *
 * The gateway's own tokens are 43 opaque characters — fine for a QR code, useless for a
 * human. The window therefore carries a six-digit code as its token: the same window,
 * the same one-time semantics, a form that survives being typed or dictated. Digits only
 * so there is nothing to confuse between `0` and `O`.
 *
 * @param {{ gateway: object, origin: string }} handle - started gateway.
 * @param {number} [ttlMs] - how long the window lives; omitted means the gateway default.
 * @returns {Promise<{ code: string, expiresAt: number, pairUrl: string }>}
 */
export async function openReadablePairing(handle, ttlMs) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const window = await handle.gateway.access.openPairing(ttlMs, code)
  const url = new URL('/mobile-access/pair', handle.origin)
  url.hash = `instance=${encodeURIComponent(handle.config.instanceId)}&token=${encodeURIComponent(window.token)}`
  return { code: window.token, expiresAt: window.expiresAt, pairUrl: url.toString() }
}

/** Where the plugin keeps devices and TLS material across restarts. */
export function defaultStateDirectory() {
  return join(homedir(), '.dsh', 'dsh-remote')
}
