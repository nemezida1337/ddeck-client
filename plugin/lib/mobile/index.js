/**
 * Our own mobile page.
 *
 * The document the phone opens is still the harness's own client bundle — rewriting it
 * from scratch would mean reimplementing the whole conversation surface against DSH's
 * API, and that is a different project. What we own is the *layer*: the layout, the
 * labels, the sizes, the languages. The plugin injects that layer on the way out, so any
 * client gets it — the stock plugin's mobile layer is not involved at all.
 *
 * This is deliberately the same layer that was measured on a real phone, moved from the
 * app into the plugin. Keeping one copy means the phone cannot end up with two skins
 * fighting: the app's injection recognises the plugin's marker and steps aside.
 *
 * @module dsh-remote/mobile
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Where the layer's sources live beside this module. */
const here = dirname(fileURLToPath(import.meta.url))

/** Marker the app's injection looks for before applying its own layer. */
export const LAYER_MARKER = 'data-dsh-remote-layer'

/**
 * Read the layer's sources.
 *
 * Read at startup rather than inlined: the layer is plain CSS and JS, and rebuilding the
 * gateway bundle for a colour change would be a needless step between thinking and
 * seeing it on the phone.
 *
 * @returns {Promise<{ css: string, js: string }>}
 */
export async function readLayer() {
  // Two layouts exist: sources beside this file, and the gateway bundle one directory up
  // where `import.meta.url` no longer points into `mobile/`. Trying both keeps the layer
  // readable whether the plugin runs from its sources or from the bundle.
  const candidates = [here, join(here, 'mobile')]
  for (const directory of candidates) {
    try {
      const [css, js] = await Promise.all([
        readFile(join(directory, 'skin.css'), 'utf8'),
        readFile(join(directory, 'skin.js'), 'utf8'),
      ])
      return { css, js }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  throw new Error('dsh-remote: mobile layer sources are missing (skin.css, skin.js)')
}

/**
 * Put the layer into a document.
 *
 * The layer goes before `</head>` so the page paints with the layout already applied: a
 * layer that arrives after the first paint shows the desktop furniture for a frame, and
 * on a phone that frame is the thing people remember.
 *
 * @param {string} html - the harness document.
 * @param {{ css: string, js: string }} layer
 * @param {'ru' | 'en'} language
 * @returns {string}
 */
export function injectLayer(html, layer, language) {
  const marker = ` ${LAYER_MARKER}="${language}"`
  const head = `<style${marker} data-dsh-remote-part="css">${layer.css}</style>`
  const body = `<script data-dsh-remote-part="js">${layer.js}</script>`
  let output = html
  const headIndex = output.indexOf('</head>')
  if (headIndex === -1) {
    // A document without a head is not ours to reason about; prepending keeps the layer
    // effective without guessing where a missing element would have been.
    output = head + output
  } else {
    output = `${output.slice(0, headIndex)}${head}${output.slice(headIndex)}`
  }
  const bodyIndex = output.lastIndexOf('</body>')
  return bodyIndex === -1 ? `${output}${body}` : `${output.slice(0, bodyIndex)}${body}${output.slice(bodyIndex)}`
}
