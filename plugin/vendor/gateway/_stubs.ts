/**
 * Заглушки вырезанных подсистем dsh-mobile.
 *
 * Шлюз импортирует расширения, клиентские модули, картинки компьютера, совместимость
 * и сжатие WebSocket. Все они нам не нужны: панель наша, мобильная страница наша,
 * расширения не поддерживаем. Вместо переписывания 3400 строк шлюза подменяем эти
 * модули пустыми реализациями той же формы — тогда шлюз остаётся близким к upstream,
 * а вырезанное просто ничего не делает.
 *
 * Типы (`import type`) стираются при сборке, поэтому их здесь нет.
 */

/** Клиентские модули: запоминать нечего, набор всегда пуст. */
export class ClientModulePreferenceStore {
  constructor() {}
  async initialize(): Promise<void> {}
  snapshot(): { entries: unknown[] } { return { entries: [] } }
  async save(): Promise<void> {}
}
export function parseExcludedClientModules(): string[] { return [] }

/** Страница восстановления клиентских модулей: у нас нет клиентских модулей. */
export function renderClientModuleRecoveryPage(): string { return '' }

/** Совместимость мобильного слоя: слой теперь наш, чинить нечего. */
export const MOBILE_COMPAT_PATH = '/mobile-access/compat.js'
export function ensureMobileCompatibility(): string { return '' }
export function ensureMobileGatewayMarker(): string { return '' }

/** Предел пользовательских ассетов расширений: расширений нет. */
export const LEGACY_CUSTOM_ASSET_LIMIT = 0
export const EXTENSION_LIMITS = { assets: 0, routes: 0, body: 0 }

/** Расширения: сервиса нет, ответы не откладываются. */
export class MobileExtensionError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code) }
}
export function disposeLateExtensionResponse(): void {}

/** Подготовленный JSON от воркера расширений: воркера нет. */
export function isPreparedJson(): boolean { return false }

/** Сжатие WebSocket: не поддерживаем, кадры идут как есть. */
export function bridgeCompressedWebSocket(): never {
  throw new Error('compressed websockets are not supported by dsh-remote')
}

/** Картинки компьютера: не показываем. */
export function listComputerImages(): unknown[] { return [] }
export function readComputerImage(): undefined { return undefined }

/** mDNS-объявление: живёт отдельно, здесь пустышка. */
export default class Bonjour {
  constructor() {}
  publish(): { stop(): void } { return { stop() {} } }
  find(): { start(): void; stop(): void } { return { start() {}, stop() {} } }
  destroy(): void {}
}
