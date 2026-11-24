/**
 * Certificates for the gateway.
 *
 * HTTPS is not an optional hardening step here: the phone's manifest forbids cleartext,
 * so a plain-HTTP listener is a door nobody can open. The certificate must exist before
 * the first pairing, and it must stay the same afterwards — the phone pins the CA
 * fingerprint it learned, and a CA that changed on restart would break every phone
 * already connected.
 *
 * The gateway's own contract decides the shape: `instanceId` must equal the SHA-256
 * fingerprint of the pairing CA, and the leaf must be signed by that CA. So the CA is
 * generated first, its fingerprint becomes the installation's identity, and the leaf is
 * signed by it with the machine's address in `subjectAltName`.
 *
 * @module dsh-remote/tls
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { isIP } from 'node:net'
import { join } from 'node:path'
import forge from './node-forge-bundle.js'

/** How long the installation CA lives: re-pinning every phone is the cost of shorter. */
const CA_DAYS = 3650

/** How long the leaf lives; short enough to rotate without touching the CA. */
const LEAF_DAYS = 397

/**
 * Read a file, or return undefined when it is not there.
 *
 * @param {string} file
 * @returns {Promise<string | undefined>}
 */
async function readIfPresent(file) {
  try {
    return await readFile(file, 'utf8')
  } catch {
    return undefined
  }
}

/**
 * SHA-256 of a DER certificate, lower-case hex without separators.
 *
 * This is exactly what the gateway compares against `instanceId`, and what the phone
 * pins after pairing.
 *
 * @param {string} pem - certificate in PEM form.
 * @returns {string} 64 hex characters.
 */
export function certificateFingerprint(pem) {
  const der = forge.pem.decode(pem)[0].body
  return createHash('sha256').update(der, 'binary').digest('hex')
}

/**
 * Make a key pair.
 *
 * 2048 bits: the phone may be a modest device, and a longer key only slows the handshake
 * down for no benefit on a home network.
 *
 * @returns {object} forge key pair.
 */
function keyPair() {
  return forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 })
}

/**
 * Build the installation CA.
 *
 * @returns {{ cert: string, key: string, fingerprint: string }}
 */
function createCa() {
  const pair = keyPair()
  const certificate = forge.pki.createCertificate()
  certificate.publicKey = pair.publicKey
  certificate.serialNumber = `01${forge.util.bytesToHex(forge.random.getBytesSync(8))}`
  certificate.validity.notBefore = new Date(Date.now() - 60_000)
  certificate.validity.notAfter = new Date(Date.now() + CA_DAYS * 24 * 60 * 60 * 1000)
  const attributes = [
    { name: 'commonName', value: 'DDeck CA' },
    { name: 'organizationName', value: 'DDeck' },
  ]
  certificate.setSubject(attributes)
  certificate.setIssuer(attributes)
  certificate.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
  ])
  certificate.sign(pair.privateKey, forge.md.sha256.create())
  const cert = forge.pki.certificateToPem(certificate)
  return { cert, key: forge.pki.privateKeyToPem(pair.privateKey), fingerprint: certificateFingerprint(cert) }
}

/**
 * Sign a leaf for one address with the installation CA.
 *
 * @param {{ cert: string, key: string }} ca - the installation CA.
 * @param {string} host - IPv4 address the phone dials.
 * @returns {{ cert: string, key: string }}
 */
function createLeaf(ca, host) {
  // A host list lets the same leaf cover the LAN address and a Tailscale name
  // (`DSH_REMOTE_ORIGINS`); the first entry is the common name.
  const hosts = String(host).split(',').map((entry) => entry.trim()).filter(Boolean)
  const primary = hosts[0]
  const pair = keyPair()
  const certificate = forge.pki.createCertificate()
  certificate.publicKey = pair.publicKey
  certificate.serialNumber = `02${forge.util.bytesToHex(forge.random.getBytesSync(8))}`
  certificate.validity.notBefore = new Date(Date.now() - 60_000)
  certificate.validity.notAfter = new Date(Date.now() + LEAF_DAYS * 24 * 60 * 60 * 1000)
  certificate.setSubject([{ name: 'commonName', value: primary }])
  certificate.setIssuer(forge.pki.certificateFromPem(ca.cert).subject.attributes)
  // Tailscale uses names (`mac.tailnet.ts.net`) as well as 100.x addresses. An IP in
  // the `ip` field is what node-forge accepts for IP SANs; a DNS name belongs in a
  // `dns` entry (type 2) — putting it in `ip` throws and the gateway would not start.
  const altNames = hosts.map((entry) => (isIP(entry) === 0
    ? { type: 2, value: entry }
    : { type: 7, ip: entry }))
    certificate.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
    { name: 'extKeyUsage', serverAuth: true },
    { name: 'subjectAltName', altNames },
  ])
  certificate.sign(forge.pki.privateKeyFromPem(ca.key), forge.md.sha256.create())
  return { cert: forge.pki.certificateToPem(certificate), key: forge.pki.privateKeyToPem(pair.privateKey) }
}

/**
 * Load the installation's certificates, creating them on first use.
 *
 * @param {string} stateDirectory - where the material lives.
 * @param {string} host - address the phone will dial.
 * @returns {Promise<{ caFile: string, certFile: string, keyFile: string, instanceId: string }>}
 */
export async function ensureCertificates(stateDirectory, host) {
  const directory = join(stateDirectory, 'tls')
  await mkdir(directory, { recursive: true })
  const caFile = join(directory, 'ca.pem')
  const caKeyFile = join(directory, 'ca-key.pem')
  const certFile = join(directory, 'server.pem')
  const keyFile = join(directory, 'server-key.pem')
  const hostFile = join(directory, 'leaf-host.txt')

  let ca = await readIfPresent(caFile)
  let caKey = await readIfPresent(caKeyFile)
  if (ca === undefined || caKey === undefined) {
    const created = createCa()
    ca = created.cert
    caKey = created.key
    await writeFile(caFile, ca, { mode: 0o600 })
    await writeFile(caKeyFile, caKey, { mode: 0o600 })
  }
  const instanceId = certificateFingerprint(ca)

  // The leaf is re-signed when the address changes (a laptop moves between networks) or
  // when it is missing. The CA stays, so phones keep their pin.
  const previousHost = await readIfPresent(hostFile)
  const cert = await readIfPresent(certFile)
  const key = await readIfPresent(keyFile)
  const wantedHost = String(host)
  if (cert === undefined || key === undefined || previousHost?.trim() !== wantedHost) {
    const leaf = createLeaf({ cert: ca, key: caKey }, wantedHost)
    await writeFile(certFile, leaf.cert, { mode: 0o600 })
    await writeFile(keyFile, leaf.key, { mode: 0o600 })
    await writeFile(hostFile, `${wantedHost}\n`, { mode: 0o600 })
  }
  return { caFile, certFile, keyFile, instanceId }
}
