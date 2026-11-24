# Vendored transport gateway

`plugin/vendor/gateway/` contains the transport part of
[`dsh-mobile`](https://github.com/saya-ch/dsh-mobile) **0.6.12**
(commit `0efceeb9c5698e854e9d1e227a93bf393e69effa`), licensed under Apache-2.0.
The upstream license text is kept in `plugin/LICENSE`; attribution is in
`plugin/NOTICE`.

The bundle `plugin/lib/gateway-bundle.js` is built from `plugin/vendor/entry.js`
with esbuild; build instructions are below.

## Local changes (Apache-2.0 §4b notice)

- `config.ts` — transport-only config; removed the `schemastery` schema (DDeck
  builds its config in `plugin/lib/gateway.js`).
- `gateway.ts` — QR import goes through the local SVG shim; device fingerprint is
  accepted by `native-pair`; mobile page and directory-picker integration are ours.
- `access.ts`, `storage.ts` — stable device fingerprint: repeated pairing of the
  same phone updates one record instead of adding a new one.
- `version.ts` — minimum Android app version points at the DDeck beta.
- `http-security.ts` — additional local-admin checks used by the plugin.
- `plugin/vendor/qrcode-shim.js` — QR SVG without the `qrcode` Node package.

Files not listed above are copied from upstream without functional changes.

## Build

```sh
cd plugin
npm install
npx esbuild vendor/entry.js --bundle --format=esm --platform=node --target=node20 \
  --outfile=lib/gateway-bundle.js --external:@deepseek-ai/schemastery
```
