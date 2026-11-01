// Мини-замена пакета qrcode для бандла шлюза: только SVG, без fs/png.
import QRCodeCore from 'qrcode/lib/core/qrcode.js'
import SvgTag from 'qrcode/lib/renderer/svg-tag.js'

/**
 * @param {string} text текст QR.
 * @param {{margin?: number, errorCorrectionLevel?: string, width?: number}} options параметры.
 * @returns {Promise<string>} SVG.
 */
export async function toString(text, options = {}) {
  const symbol = QRCodeCore.create(text, { errorCorrectionLevel: options.errorCorrectionLevel ?? 'M' })
  return SvgTag.render(symbol, {
    margin: options.margin ?? 1,
    width: options.width,
    color: { light: '#ffffff', dark: '#000000' },
  })
}

export default { toString }
