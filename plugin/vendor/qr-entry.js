// QR без Node-зависимостей qrcode: только ядро и SVG-рендерер.
import QRCodeCore from 'qrcode/lib/core/qrcode.js'
import SvgTag from 'qrcode/lib/renderer/svg-tag.js'

/**
 * @param {string} payload текст для QR.
 * @param {{margin?: number, errorCorrectionLevel?: string, width?: number}} options параметры.
 * @returns {string} SVG-разметка QR-кода.
 */
export function renderQr(payload, options = {}) {
  const symbol = QRCodeCore.create(payload, { errorCorrectionLevel: options.errorCorrectionLevel ?? 'M' })
  return SvgTag.render(symbol, {
    margin: options.margin ?? 1,
    width: options.width,
    color: { light: '#ffffff', dark: '#000000' },
  })
}
