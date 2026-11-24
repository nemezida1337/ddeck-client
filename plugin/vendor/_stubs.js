/**
 * Заглушки вырезанных подсистем dsh-mobile.
 *
 * Шлюз импортирует расширения, клиентские модули, картинки компьютера, совместимость и
 * сжатие WebSocket. Всё это нам не нужно: панель наша, мобильная страница наша,
 * расширения не поддерживаем. Вместо переписывания 3400 строк шлюза подменяем модули
 * реализациями той же формы — шлюз остаётся близким к upstream, а вырезанное молчит.
 */

/** Клиентские модули: запоминать нечего, набор всегда пуст. */
export class ClientModulePreferenceStore {
  constructor() {}
  async initialize() {}
  snapshot() { return { entries: [] } }
  async save() {}
}
export function parseExcludedClientModules() { return [] }

/** Страница восстановления клиентских модулей: у нас их нет. */
export function renderClientModuleRecoveryPage() { return '' }

/** Совместимость мобильного слоя: слой теперь наш, чинить нечего. */
export const MOBILE_COMPAT_PATH = '/mobile-access/compat.js'
export function ensureMobileCompatibility() { return '' }
export function ensureMobileGatewayMarker() { return '' }

/** Пределы пользовательских ассетов расширений: расширений нет. */
export const LEGACY_CUSTOM_ASSET_LIMIT = 0
export const EXTENSION_LIMITS = Object.freeze({ assets: 0, routes: 0, body: 0 })

/** Расширения: сервиса нет, отложенные ответы не освобождаем. */
export class MobileExtensionError extends Error {
  constructor(status, code) {
    super(code)
    this.status = status
    this.code = code
  }
}
export function disposeLateExtensionResponse() {}

/** Подготовленный JSON от воркера расширений: воркера нет. */
export function isPreparedJson() { return false }

/** Сжатие WebSocket: не поддерживаем. */
export function bridgeCompressedWebSocket() {
  throw new Error('dsh-remote: compressed websockets are not supported')
}

/** Картинки компьютера: не показываем. */
export function listComputerImages() { return [] }
export function readComputerImage() { return undefined }

/** Пути WebSocket: принимаем как есть, без нормализации. */
export function normalizeWebSocketPaths(paths) { return Array.isArray(paths) ? paths : [] }

/** Запуск внешних воркеров расширений: не наш случай. */
export function resolveHostExecution(value) {
  return { ...(value ?? {}), kind: 'none' }
}

/** mDNS-объявление: пустышка. */
// The mDNS advertisement is not part of the first version: discovery needs a client that
// listens for it, and ours does not yet. The stub answers every call the gateway makes so
// the rest of the transport can run.
export default class Bonjour {
  constructor() {}
  publish(service, callback) { callback?.(); return { stop() {} } }
  unpublishAll(callback) { callback?.() }
  find() { return { start() {}, stop() {} } }
  destroy(callback) { callback?.() }
}
