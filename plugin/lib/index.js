/**
 * DDeck — the computer half.
 *
 * One job the person can see: show a code that turns their phone into a remote control
 * for this computer. Everything a phone needs beyond that — the pairing handshake, the
 * session credential, the proxy to the harness, the mobile page — lives behind it.
 *
 * The pairing window is deliberately short-lived and rotates on its own. A wedged QR on
 * a screen is a credential sitting in the open; one that refreshes every few minutes is
 * a credential with a shelf life, and the person never has to press "regenerate" because
 * they were reading the instructions.
 *
 * @module dsh-remote
 */

import { randomBytes } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { homedir, networkInterfaces } from 'node:os'
import { dirname, join } from 'node:path'
import { autoOrigins, defaultStateDirectory, openReadablePairing, startGateway } from './gateway.js'
import { renderQr as renderQrSvg } from './qr-bundle.js'
import { isTrustedAdminRequest } from './admin-trust.js'
import { PAIRING_TTL_MS } from './constants.js'

/** Stable Cordis plugin name; must equal the package name (see cordis.patch.yml). */
export const name = 'dsh-remote'

/**
 * The web server hosts our routes; `connection` supplies the launch-token URL the
 * gateway exchanges for an upstream session. Without that exchange the harness answers
 * every proxied request with 401 and the phone shows `upstream_unavailable`.
 */
export const inject = ['webServer', 'connection']

/** Prefix every route of this plugin lives under. */
export const ROUTE_PREFIX = '/dsh-remote'

/**
 * Prefix of the phone-facing page.
 *
 * The split is what protects the pairing window. A gateway in front of DSH proxies to
 * it from loopback, so an address check cannot tell the person at the keyboard from a
 * phone that is already paired — both arrive from 127.0.0.1. The split therefore has to
 * be by *path*: the phone loads `${MOBILE_PREFIX}`, and the gateway refuses the whole of
 * `${ROUTE_PREFIX}` for proxied traffic. Without that refusal a paired phone could open
 * the pairing page and add itself a companion, which is the one escalation this whole
 * scheme exists to prevent.
 */
export const MOBILE_PREFIX = '/m'

/** How long a pairing window stays valid. */
const WINDOW_MS = PAIRING_TTL_MS

/** Версия плагина из единственного источника — plugin/package.json. */
const PLUGIN_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version

/**
 * Where the plugin keeps its own small state.
 *
 * Not the gateway's state directory: this file holds the instance identity and the
 * secret that derives pairing codes, and it belongs to the plugin that owns it.
 *
 * @returns {string} absolute path to the state file.
 */
function statePath() {
  return join(homedir(), '.dsh', 'dsh-remote', 'state.json')
}

/**
 * Load or create the persistent identity.
 *
 * The instance id names this installation in a QR payload, and the secret turns a
 * pairing token into a six-digit code. Both survive restarts: a phone that scanned a
 * code must keep recognising the same computer, and a code shown a minute ago must
 * still verify after a plugin reload.
 *
 * @returns {Promise<{ instanceId: string, secret: string, devices: object[] }>}
 */
async function loadState() {
  const file = statePath()
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'))
    if (typeof parsed.instanceId === 'string' && typeof parsed.secret === 'string') {
      return { devices: [], ...parsed }
    }
  } catch {
    // First run, or a file we cannot read: a fresh identity is the safe answer.
  }
  const fresh = {
    instanceId: randomBytes(16).toString('hex'),
    secret: randomBytes(32).toString('hex'),
    devices: [],
  }
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(fresh, null, 2)}\n`, { mode: 0o600 })
  return fresh
}

/**
 * Derive the six-digit code for a pairing token.
 *
 * The code is not a second secret: it is the same window in a form a person can read
 * aloud or type when the camera will not cooperate. Digits only, no letters — the
 * alphabet question disappears, and there is nothing for a reader to confuse.
 *
 * @param {string} secret - per-installation secret.
 * @param {string} token - pairing token of the open window.
 * @returns {string} six digits, zero-padded.
 */
function newCode() {
  // Independent of the QR ticket on purpose: the ticket rotates every minute or so, and
  // a code that changed with it could never be typed from a screenshot. Six digits from
  // the whole range, zero-padded, so `000042` is a valid code.
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0')
}

/**
 * The live pairing window, if one is open.
 *
 * Held in memory on purpose: closing the plugin, restarting DSH or a crash must not
 * leave a usable credential behind, and a window is cheap to open again.
 */
class PairingWindow {
  constructor() {
    /** @type {{ token: string, code: string, expiresAt: number, attempts: number } | undefined} */
    this.current = undefined
  }

  /**
   * Return the open window, opening a fresh one when the old one has expired.
   *
   * @returns {{ token: string, code: string, expiresAt: number }}
   */
  open() {
    const now = Date.now()
    if (this.current !== undefined && this.current.expiresAt > now) {
      return this.current
    }
    // 24 bytes of entropy: a token that cannot be guessed from a photograph of the
    // screen next to it, and short enough for a compact QR.
    const token = randomBytes(24).toString('base64url')
    this.current = { token, code: newCode(), expiresAt: now + WINDOW_MS }
    return this.current
  }

}

/**
 * Render the phone's entry page.
 *
 * Two languages are served from one document: the page picks by `Accept-Language` and
 * carries a switch, because the person holding the phone decides which language they
 * read, and a product that guesses once and never asks gets it wrong for someone.
 *
 * @param {'ru' | 'en'} language
 * @param {{ pairing: { code: string }, qrSvg: string }} view
 * @returns {string} complete HTML document.
 */
function entryPage(language, view) {
  const ru = language === 'ru'
  const text = {
    heading: ru ? 'Подключение телефона' : 'Connect your phone',
    lead: ru
      ? 'Откройте приложение DDeck и наведите камеру на код.'
      : 'Open the DDeck app and point its camera at the code.',
    or: ru ? 'или введите код на телефоне' : 'or type this code on the phone',
    where: ru ? 'телефон подключится к' : 'the phone will connect to',
    alsoReachable: ru ? 'также доступен по' : 'also reachable at',
    status: ru ? 'Плагин работает' : 'Plugin running',
    noGateway: ru
      ? 'Шлюз не запустился — телефон не подключится. Подробности в журнале DSH.'
      : 'The gateway did not start — the phone cannot connect. See the DSH log.',
    connected: ru ? 'Телефон подключён' : 'Phone connected',
    connectedLead: ru ? 'Этот компьютер открыт для перечисленных устройств.' : 'This computer is open to the devices listed below.',
    revoke: ru ? 'Отключить' : 'Disconnect',
    pairAnother: ru ? 'Подключить ещё один телефон' : 'Connect another phone',
    advanced: ru ? 'Дополнительно' : 'Advanced',
    switchLabel: ru ? 'English' : 'Русский',
  }
  const switchHref = `${ROUTE_PREFIX}?lang=${ru ? 'en' : 'ru'}`
  const paired = view.devices.length > 0
  const deviceWord = (count) => {
    if (!ru) return count === 1 ? 'device' : 'devices'
    const mod10 = count % 10
    const mod100 = count % 100
    if (mod10 === 1 && mod100 !== 11) return 'устройство'
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'устройства'
    return 'устройств'
  }
  const when = (time) => {
    const locale = ru ? 'ru-RU' : 'en-GB'
    return new Date(time).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }
  const advanced = [
    [ru ? 'Адрес' : 'Address', view.origin],
    [ru ? 'Отпечаток' : 'Fingerprint', String(view.instanceId).slice(0, 16) + '…'],
    [ru ? 'Шлюз' : 'Gateway', view.gateway ? (ru ? 'работает' : 'running') : (ru ? 'не запущен' : 'not running')],
  ]

  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>DDeck</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #12151c; --fg: #e6e8eb; --muted: #a8adb7; --line: #2a2f3a; --ok: #4caf7d;
  }
  * { box-sizing: border-box }
  /* Сетка с одной колонкой фиксированной ширины: без этого колонка тянется по самому
   * широкому содержимому, и в узком окне список устройств уводил всю страницу вправо —
   * заголовок и адрес обрезались.
   */
  body { margin: 0; min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr);
    place-items: center; padding: 0 1.5rem;
    background: var(--bg); color: var(--fg);
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif }
  main { width: 100%; max-width: 26rem; min-width: 0; text-align: center; padding: 2rem 0 }
  h1 { font-size: 1.375rem; font-weight: 600; margin: 0 0 .5rem }
  p.lead { margin: 0 0 1.75rem; color: var(--muted) }
  .qr { display: inline-block; padding: .75rem; border-radius: 1rem; background: #fff; line-height: 0 }
  .qr svg { width: 15rem; height: 15rem; display: block }
  .code-label { margin: 1.5rem 0 .375rem; font-size: .8125rem; letter-spacing: .04em;
    text-transform: uppercase; color: var(--muted) }
  .code { font: 600 2rem/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: .28em; padding-left: .28em }
  .where { margin: 1.5rem 0 0; font-size: .8125rem; color: var(--muted) }
  .where code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--fg) }
  .status { margin-top: 1rem; display: inline-flex; gap: .5rem; align-items: center;
    padding: .4375rem .875rem; border: 1px solid var(--line); border-radius: 999px;
    font-size: .8125rem; color: #8fbf9f }
  .dot { width: .5rem; height: .5rem; border-radius: 50%; background: var(--ok) }
  .bad { color: #e0a3a3; border-color: #4a2f2f }
  .bad .dot { background: #d9534f }
  footer { margin-top: 2rem }
  a { color: var(--muted) }
  .devices { list-style: none; margin: 0 0 .5rem; padding: 0; text-align: left;
    border: 1px solid var(--line); border-radius: .875rem; overflow: hidden }
  .devices li { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem .75rem; padding: .75rem 1rem }
  .devices .name { overflow-wrap: anywhere }
  .devices li + li { border-top: 1px solid var(--line) }
  .devices .name { flex: 1 1 auto; font-weight: 500 }
  .devices .meta { color: var(--muted); font-size: .8125rem }
  .devices .revoke { border: 1px solid var(--line); border-radius: .5rem; background: transparent;
    color: #e0a3a3; padding: .375rem .625rem; font: inherit; font-size: .8125rem; cursor: pointer;
    /* 44 px — тот же минимум, что и в мобильном слое: палец не должен прицеливаться. */
    min-height: 2.75rem }
  .count { color: var(--muted); font-size: .8125rem; margin: 0 0 1.5rem }
  details { margin-top: 1.5rem; text-align: left }
  details > summary { cursor: pointer; color: var(--muted); font-size: .875rem;
    list-style: none; display: flex; align-items: center; gap: .375rem; min-height: 2.75rem }
  details > summary::-webkit-details-marker { display: none }
  details > summary::after { content: '›'; transform: rotate(90deg); transition: transform .15s ease }
  details[open] > summary::after { transform: rotate(-90deg) }
  .pair-more > summary { justify-content: center }
  .pair-more .qr { margin-top: .5rem }
  .advanced dl { margin: .5rem 0 0; display: grid; grid-template-columns: auto 1fr; gap: .375rem .75rem }
  .advanced dt { color: var(--muted); font-size: .8125rem }
  .advanced dd { margin: 0; font-size: .8125rem; overflow-wrap: anywhere }
</style>
</head>
<body>
<main>
  <h1>${paired ? text.connected : text.heading}</h1>
  <p class="lead">${paired ? text.connectedLead : text.lead}</p>
  ${paired
    ? `<ul class="devices">${view.devices.map((device) => `<li><span class="name">${escapeHtml(device.label)}</span><span class="meta">${when(device.lastSeenAt)}</span><button type="button" class="revoke" data-id="${escapeHtml(device.id)}">${text.revoke}</button></li>`).join('')}</ul>
       <p class="count">${view.devices.length} ${deviceWord(view.devices.length)}</p>
       <details class="pair-more"><summary>${text.pairAnother}</summary><div class="qr" id="qr">${view.qrSvg}</div><p class="code-label">${text.or}</p><div class="code" id="code">${view.pairing.code}</div></details>`
    : `<div class="qr" id="qr">${view.qrSvg}</div>
       <p class="code-label">${text.or}</p>
       <div class="code" id="code">${view.pairing.code}</div>`}
  <p class="where">${text.where} <code>${view.origin}</code></p>
  ${view.altOrigins && view.altOrigins.length > 0
    ? `<p class="where alt">${text.alsoReachable} ${view.altOrigins.map((origin) => `<code>${escapeHtml(origin)}</code>`).join(', ')}</p>`
    : ''}
  <div class="status${view.gateway ? '' : ' bad'}"><span class="dot"></span>${view.gateway ? text.status : text.noGateway}</div>
  <details class="advanced">
    <summary>${text.advanced}</summary>
    <dl>${advanced.map(([key, value]) => `<dt>${key}</dt><dd><code>${escapeHtml(String(value))}</code></dd>`).join('')}</dl>
  </details>
  <footer><a href="${switchHref}" rel="alternate" hreflang="${ru ? 'en' : 'ru'}">${text.switchLabel}</a></footer>
</main>
<script>
// The window rotates on its own; the page follows it instead of showing a dead code.
// A person reading the instructions should never come back to "code expired" and have
// to press something to continue.
(function () {
  var qr = document.getElementById('qr')
  var code = document.getElementById('code')
  var shown = code ? code.textContent.trim() : ''
  function refresh() {
    fetch('${ROUTE_PREFIX}/pairing', { cache: 'no-store' })
      .then(function (response) { return response.ok ? response.json() : null })
      .then(function (next) {
        if (!next || !next.code || next.code === shown) return
        shown = next.code
        code.textContent = next.code
        if (next.qrSvg) qr.innerHTML = next.qrSvg
      })
      .catch(function () { /* offline: keep what is on screen */ })
  }
  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('.revoke') : null
    if (!button) return
    button.disabled = true
    fetch('${ROUTE_PREFIX}/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId: button.getAttribute('data-id') }),
    }).then(function () { location.reload() }).catch(function () { button.disabled = false })
  })
  setInterval(refresh, 2000)
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh()
  })
}())
</script>
</body>
</html>`
}

/**
 * Origins the phone may dial, from the environment or the network probe.
 *
 * `DSH_REMOTE_ORIGINS` (comma-separated) wins over `DSH_REMOTE_ORIGIN`; without either
 * the gateway auto-detects a Tailscale address (works from any network) and adds the
 * LAN address second (fast at home). The first origin is primary and lands in the QR.
 *
 * @param {number} port - gateway port.
 * @returns {string[]} origins in priority order; empty when nothing is known yet.
 */
function configuredOrigins(port) {
  const multiple = process.env.DSH_REMOTE_ORIGINS
  if (typeof multiple === 'string' && multiple.trim() !== '') {
    return multiple.split(',').map((value) => value.trim()).filter(Boolean)
  }
  const single = process.env.DSH_REMOTE_ORIGIN
  if (typeof single === 'string' && single.trim() !== '') return [single.trim()]
  // «Свой сервер»: установщик кладёт публичный origin в state-каталог. Это
  // переживает перезапуск DSH и не требует правки launchctl/окружения.
  const fromFile = readOriginsFile()
  if (fromFile.length > 0) return fromFile
  return autoOrigins(port)
}

/**
 * Origins, сохранённые установщиком своего сервера.
 *
 * @returns {string[]} origins или пустой массив.
 */
function readOriginsFile() {
  const file = join(homedir(), '.dsh', 'dsh-remote', 'origins.json')
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const values = Array.isArray(parsed?.origins) ? parsed.origins : []
    return values
      .filter((value) => typeof value === 'string' && /^https?:\/\//u.test(value))
      .map((value) => value.trim())
  } catch {
    return []
  }
}

/**
 * Find an address the phone can actually reach when the gateway could not start.
 *
 * This is the degraded pairing page (no TLS listener): it needs a plain HTTP origin and
 * only runs when the gateway failed. In the normal path `configuredOrigins` is what the
 * QR carries.
 *
 * @param {number} port - port this DSH instance listens on.
 * @returns {string | undefined} origin such as `http://192.168.1.10:3449`, or undefined.
 */
function reachableOrigin(port) {
  const configured = configuredOrigins(port)[0]
  if (configured !== undefined) return configured
  const candidates = []
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (name === 'lo0' || name.startsWith('utun') || name.startsWith('bridge')) continue
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue
      const [a, b] = address.address.split('.').map(Number)
      const isPrivate = a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      if (isPrivate) candidates.push(address.address)
    }
  }
  return candidates.length > 0 ? `http://${candidates[0]}:${String(port)}` : undefined
}

/**
 * Список сессий с компьютера.
 *
 * Читаем кэш проекций DSH: у каждой сессии там есть `record.identity.cwd` (рабочая
 * область) и `record.rows.title.val` (заголовок). Разбирать журналы сессий не нужно —
 * кэш уже содержит то, что показывает настольное приложение.
 *
 * @returns {Promise<Array<{ id: string, title: string, workspace: string, createdAt: number }>>}
 */
async function readSessions() {
  const root = join(homedir(), '.dsh', 'storages', 'session_projcache', 'sessions')
  let names
  try {
    names = await readdir(root)
  } catch {
    return []
  }
  const sessions = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    try {
      const parsed = JSON.parse(await readFile(join(root, name), 'utf8'))
      const record = parsed?.record
      const identity = record?.identity
      const title = record?.rows?.title?.val
      if (typeof identity?.cwd !== 'string') continue
      sessions.push({
        id: name.replace(/\.json$/u, ''),
        title: typeof title === 'string' && title.trim() !== '' ? title.trim() : 'Без названия',
        workspace: identity.cwd,
        createdAt: typeof identity.createdAt === 'number' ? identity.createdAt : 0,
      })
    } catch {
      // Битый или недописанный файл кэша — пропускаем, а не роняем список.
    }
  }
  // Сначала названные, потом свежие безымянные.
  //
  // Раньше брались просто 40 самых новых файлов кэша — и в списке оказывались одни
  // пустые заготовки (title = null), а настоящие сессии с названиями не попадали вовсе:
  // в кэше их 269, названия есть у старых.
  const named = sessions.filter((session) => session.title !== 'Без названия')
  const blank = sessions.filter((session) => session.title === 'Без названия')
  named.sort((a, b) => b.createdAt - a.createdAt)
  blank.sort((a, b) => b.createdAt - a.createdAt)
  return [...named.slice(0, 30), ...blank.slice(0, 6)]
}

/**
 * Choose the language for a request.
 *
 * An explicit `?lang=` wins — it is the switch being used. Otherwise the first
 * `Accept-Language` entry decides, and anything that is not Russian gets English:
 * a wrong guess is recoverable with one tap, a missing page is not.
 *
 * @param {URL} url
 * @param {string} headerValue
 * @returns {'ru' | 'en'}
 */
/**
 * Escape a value for HTML.
 *
 * Device labels are chosen by the person and come back from the phone, and the page
 * prints them. An unescaped label is a scripting hole with a friendly face.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function pickLanguage(url, headerValue) {
  const chosen = url.searchParams.get('lang')
  if (chosen === 'ru' || chosen === 'en') return chosen
  return /^\s*ru\b/i.test(headerValue) ? 'ru' : 'en'
}

/**
 * Render the QR for a pairing payload.
 *
 * @param {string} payload - what the phone will read.
 * @returns {Promise<string>} inline SVG, or an empty string when rendering fails.
 */
async function renderQr(payload) {
  try {
    return renderQrSvg(payload, { margin: 1, errorCorrectionLevel: 'M' })
  } catch {
    // The code below the QR is the fallback; a failed render must not break the page.
    return ''
  }
}

/**
 * Build the pairing payload the phone reads.
 *
 * One object, versioned, carrying everything the app needs: where the computer is and
 * which window is open. No separate fields for the person to copy.
 *
 * @param {string} origin - origin the phone should use.
 * @param {string} instanceId
 * @param {string} token
 * @returns {string} URI for the QR.
 */
function pairingUri(origin, instanceId, token, expiresAt) {
  const url = new URL('dshremote://pair')
  url.searchParams.set('v', '1')
  url.searchParams.set('u', origin)
  url.searchParams.set('i', instanceId)
  url.searchParams.set('t', token)
  // A hint, not a rule: the phone can reject an old code before spending a request,
  // and the server still checks the window itself because a phone's clock is not a
  // trustworthy authority.
  url.searchParams.set('e', String(Math.floor(expiresAt / 1000)))
  return url.toString()
}


/**
 * Activate the plugin.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - Cordis context provided by DSH.
 */
export function apply(ctx) {
  const logger = ctx.logger('dsh-remote')
  const pairing = new PairingWindow()
  const statePromise = loadState()

  /** Started gateway, or undefined while it is still coming up or after a failure. */
  let gateway

  /**
   * Devices that may right now open this computer.
   *
   * Revoked and expired entries are dropped: a list that shows dead entries teaches the
   * person to ignore it.
   */
  const pairedDevices = () => {
    if (gateway === undefined) return []
    const now = Date.now()
    return gateway.gateway.access.listDevices()
      .filter((device) => device.revokedAt === undefined && device.expiresAt > now)
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .map((device) => ({
        id: device.id,
        label: device.label,
        lastSeenAt: device.lastSeenAt,
        expiresAt: device.expiresAt,
      }))
  }

  /** Read a small JSON body without trusting its size. */
  const readBody = async (request) => {
    const chunks = []
    let bytes = 0
    for await (const chunk of request) {
      bytes += chunk.length
      if (bytes > 8 * 1024) throw new Error('body too large')
      chunks.push(chunk)
    }
    if (bytes === 0) return {}
    try {
      const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      return parsed !== null && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  /**
   * The pairing window the page currently shows.
   *
   * The page polls every two seconds; opening a fresh window on every poll rotated the
   * six-digit code out from under the person reading it and made the QR unreliable.
   * One window is reused until it is close to expiry or the paired-device count
   * changes (which means it was just consumed).
   */
  let shownPairing

  /**
   * What the page shows right now: a code and the QR that carries it.
   *
   * The gateway is asked first because only it can pair a phone — its window is the one
   * `native-pair` accepts. Without a gateway the page falls back to a local window and
   * says so, which is more useful than an empty screen: the person learns that pairing
   * is unavailable instead of pointing a camera at nothing.
   */
  const currentPairing = async (state, options = {}) => {
    // Явный запрос «новый код»: инвалидируем кэш и открываем новое окно, иначе
    // панель «Обновить» показывала тот же QR до пяти минут.
    if (options.refresh === true) shownPairing = undefined
    // Устройства отдаём вместе с кодом: панель на телефоне показывает список подключённых
    // рядом с QR. Раньше их здесь не было, и панель всегда писала «Пока ни одного
    // устройства», хотя телефон уже был подключён (в /status он есть).
    const devices = pairedDevices()
    if (gateway !== undefined) {
      const now = Date.now()
      const stale = shownPairing === undefined
        || shownPairing.gateway !== gateway
        || shownPairing.expiresAt - now <= 5_000
        || shownPairing.deviceCount !== devices.length
        || gateway.gateway.access.hasPairingWindow?.() === false
      if (stale) {
        const opened = await openReadablePairing(gateway, PAIRING_TTL_MS)
        shownPairing = {
          gateway,
          code: opened.code,
          expiresAt: opened.expiresAt,
          pairUrl: opened.pairUrl,
          deviceCount: devices.length,
        }
      }
      return {
        code: shownPairing.code,
        expiresAt: shownPairing.expiresAt,
        pairUri: shownPairing.pairUrl,
        origin: gateway.origin,
        origins: gateway.origins,
        gateway: true,
        // CA fingerprint from the invitation; the app pins it instead of trusting the
        // first certificate it sees (TOFU) when it pairs from a link or an intent.
        instance: gateway.config.instanceId,
        devices,
      }
    }
    const window = pairing.open()
    const origin = reachableOrigin(ctx.webServer.port) ?? `http://127.0.0.1:${String(ctx.webServer.port)}`
    return {
      code: window.code,
      expiresAt: window.expiresAt,
      pairUri: pairingUri(origin, state.instanceId, window.token, window.expiresAt),
      origin,
      origins: [origin],
      gateway: false,
      instance: state.instanceId,
      devices,
    }
  }

  /**
   * Origin the phone should use: the address the person reached DSH on.
   *
   * Behind a proxy the scheme comes from `x-forwarded-proto`; otherwise the Host the
   * request arrived with is the truth, because that is the address the phone will use
   * too.
   */
  const originOf = (request) => {
    const host = request.headers.host
    const forwarded = request.headers['x-forwarded-proto']
    const scheme = typeof forwarded === 'string' && forwarded.startsWith('https') ? 'https' : 'http'
    return typeof host === 'string' && host !== '' ? `${scheme}://${host}` : `http://127.0.0.1:${ctx.webServer.port}`
  }

  // `ctx.effect` owns the registration: DSH may disable or reload the plugin at any
  // time, and the routes have to disappear with it rather than answering from a dead
  // plugin.
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE_PREFIX,
    handler: async (request, response) => {
      const state = await statePromise
      const url = new URL(request.url ?? '/', 'http://localhost')

      if (!isTrustedAdminRequest(request)) {
        // No QR, no code, no hint of one: this address is for the person at the machine.
        response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
        response.end('dsh-remote: open this page on the computer itself\n')
        return
      }

      if (url.pathname === `${ROUTE_PREFIX}/pairing`) {
        let current
        try {
          // «Новый код» — только POST: GET-ротация позволяет чужой странице
          // вращать окно сопряжения через CSRF/DNS-rebinding.
          const method = (request.method ?? 'GET').toUpperCase()
          current = await currentPairing(state, { refresh: method === 'POST' })
        } catch (error) {
          // A failure here is the difference between a working phone and a blank screen;
          // say what happened instead of letting the server answer 400 with no body.
          response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
          response.end(JSON.stringify({ error: 'pairing_failed', message: error instanceof Error ? error.message : String(error) }))
          return
        }
        const qrSvg = await renderQr(current.pairUri)
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        // The URI travels with the image on purpose: the app can be handed either one,
        // and a test can assert what the QR holds without decoding a picture.
        response.end(JSON.stringify({ ...current, qrSvg }))
        return
      }

      if (url.pathname === `${ROUTE_PREFIX}/sessions`) {
        // Свой список сессий: настольный клиент на нашей странице переходы не выполняет,
        // поэтому список и открытие делаем сами. Заголовки берём из кэша проекций DSH —
        // это те же данные, что видит приложение на компьютере.
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        response.end(JSON.stringify({ sessions: await readSessions() }))
        return
      }

      if (url.pathname === `${ROUTE_PREFIX}/devices`) {
        // Только список сопряжённых устройств: инструменты гигиены не должны
        // открывать новое окно сопряжения ради чтения списка.
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        response.end(JSON.stringify({ devices: pairedDevices() }))
        return
      }

      if (url.pathname === `${ROUTE_PREFIX}/status`) {
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        response.end(JSON.stringify({
          plugin: 'dsh-remote',
          version: PLUGIN_VERSION,
          instanceId: gateway?.config.instanceId ?? state.instanceId,
          origin: gateway?.origin,
          gateway: gateway !== undefined,
          // Four is what fits above the fold on a laptop panel without pushing the QR out
        // of sight; the count line still says how many there are in total.
        devices: pairedDevices().slice(0, 4),
        }))
        return
      }

      // Disconnecting a phone is an ordinary action, not a corner case: phones get lost,
      // sold and replaced, and the person needs a way to take access away.
      if (url.pathname === `${ROUTE_PREFIX}/revoke` && request.method === 'POST') {
        const body = await readBody(request)
        const deviceId = typeof body.deviceId === 'string' ? body.deviceId : ''
        if (gateway === undefined || !/^[a-f\d]{32}$/u.test(deviceId)) {
          response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
          response.end(JSON.stringify({ error: 'invalid_request' }))
          return
        }
        const removed = await gateway.gateway.access.revokeDevice(deviceId)
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        response.end(JSON.stringify({ removed }))
        return
      }

      // An address under our prefix that we did not define is a mistake, not a page:
      // answering with HTML here would hide a typo behind a working-looking screen.
      if (url.pathname.startsWith(`${ROUTE_PREFIX}/`)) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
        response.end('dsh-remote: not found\n')
        return
      }

      const language = pickLanguage(url, String(request.headers['accept-language'] ?? ''))
      const current = await currentPairing(state)
      const view = {
        pairing: { code: current.code },
        origin: current.origin,
        altOrigins: (current.origins ?? []).filter((value) => value !== current.origin),
        gateway: current.gateway,
        instanceId: gateway?.config.instanceId ?? state.instanceId,
        // Four is what fits above the fold on a laptop panel without pushing the QR out
        // of sight; the count line still says how many there are in total.
        devices: pairedDevices().slice(0, 4),
        qrSvg: await renderQr(current.pairUri),
      }
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'content-language': language,
        'cache-control': 'no-store',
      })
      response.end(entryPage(language, view))
    },
  }), 'dsh-remote: phone entry page')

  ctx.effect(() => {
    let handle
    let closed = false
    const upstreamOrigin = `http://127.0.0.1:${String(ctx.webServer.port)}`
    // The harness authenticates its browser client with a one-time launch token. The
    // gateway needs that same credential to proxy on the phone's behalf.
    let upstreamLoginUrl
    try {
      const authenticated = ctx.connection?.authenticatedUrl?.(upstreamOrigin)
      if (typeof authenticated === 'string' && new URL(authenticated).search !== '') {
        upstreamLoginUrl = authenticated
      }
    } catch (error) {
      logger.warn('connection.authenticatedUrl failed: %s', error instanceof Error ? error.message : String(error))
    }
    if (upstreamLoginUrl === undefined) {
      logger.warn('no upstream login URL: proxied requests will likely fail')
    }
    const port = Number(process.env.DSH_REMOTE_PORT ?? '3449')
    void startGateway({
      upstreamPort: ctx.webServer.port,
      upstreamLoginUrl,
      stateDirectory: defaultStateDirectory(),
      port,
      ...(configuredOrigins(port).length > 0 ? { origins: configuredOrigins(port) } : {}),
      onWarning: (message) => { logger.warn('%s', message) },
    }).then((started) => {
      handle = started
      if (closed) { void started.close(); return }
      gateway = started
      logger.info('gateway listening on %s', started.origin)
    }).catch((error) => {
      // A gateway that cannot start must not take the page down with it: the page still
      // shows a code and says what is wrong, and the person can act on that.
      logger.error('gateway failed: %s', error instanceof Error ? error.message : String(error))
    })
    return () => {
      closed = true
      if (gateway === handle) gateway = undefined
      void handle?.close()
    }
  }, 'dsh-remote: gateway')

  logger.info('dsh-remote ready: %s (pairing window %ds)', ROUTE_PREFIX, WINDOW_MS / 1000)
}
