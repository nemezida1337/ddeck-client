/**
 * Проверка «это админ-запрос с компьютера».
 *
 * Одного loopback-адреса мало: DNS-rebinding даёт чужой странице доступ к
 * loopback-API, а `/dsh-remote/pairing` отдаёт токен сопряжения — то есть контроль
 * над компьютером. Поэтому проверяются Host (локальный/приватный), `Sec-Fetch-Site`
 * и Origin, как это делает вендорный `assertLocalAdminTrust` в шлюзе.
 *
 * @module dsh-remote/admin-trust
 */

/**
 * @param {string} address адрес сокета.
 * @returns {boolean} это петля?
 */
export function isLoopbackAddress(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

/**
 * @param {string} hostname имя хоста без скобок.
 * @returns {boolean} локальное/приватное имя, которому можно отдавать админ-API.
 */
export function isLocalAdminHostname(hostname) {
  if (hostname === 'localhost' || hostname === '::1') return true
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
}

/**
 * @param {import('node:http').IncomingMessage} request запрос.
 * @returns {boolean} можно ли отдавать админ-ответ.
 */
export function isTrustedAdminRequest(request) {
  if (request?.socket === undefined || !isLoopbackAddress(request.socket.remoteAddress ?? '')) return false
  const hostHeader = request.headers?.host
  if (typeof hostHeader !== 'string' || /[/?#@\\]/u.test(hostHeader)) return false
  let authority
  let hostname
  try {
    const parsed = new URL(`http://${hostHeader}`)
    if (parsed.pathname !== '/' || parsed.username !== '' || parsed.password !== '') return false
    authority = parsed.host.toLowerCase()
    hostname = parsed.hostname.replace(/^\[|\]$/gu, '').toLowerCase()
  } catch {
    return false
  }
  if (!isLocalAdminHostname(hostname)) return false
  const site = request.headers['sec-fetch-site']
  if (site !== undefined && site !== 'same-origin' && site !== 'none') return false
  const origin = request.headers.origin
  if (origin !== undefined) {
    try {
      const parsed = new URL(origin)
      if (parsed.host.toLowerCase() !== authority) return false
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    } catch {
      return false
    }
  }
  return true
}
