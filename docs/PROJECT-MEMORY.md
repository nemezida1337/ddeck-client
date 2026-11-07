# DDeck: current project memory

**Updated 2 November 2026.** Short, maintained memory of the project.

DDeck is an Android remote control for **DeepSeek Harness (DSH)**. It consists of:

- Android app `app.ddeck.client` (Kotlin/WebView, Android 10+, TLS pinning,
  Android Keystore, foreground service);
- DSH plugin **`ddeck-remote`** (npm), which runs a gateway on port **3449** and
  serves the phone page **`/m`**;
- mobile layer `plugin/lib/mobile/skin.{css,js}` served with `/m`.

The admin route is **`/dsh-remote`** (loopback only); the npm package is
`ddeck-remote`. Do not rename the route with the package.

## Current release

- **0.10.0-beta** (versionCode 1000).
- GitHub: <https://github.com/nemezida1337/ddeck-client/releases/tag/v0.10.0-beta>
- npm: `ddeck-remote@0.10.0-beta` (`latest`).
- Landing: <https://nemezida1337.github.io/ddeck-client/>.
- APK SHA-256: резервный SHA заполняется после сборки 0.10.0.

## Build/release

- JDK 17, Android SDK 36; `./gradlew :app:assembleRelease :app:bundleRelease`.
- Signing key lives outside the repo (`android/keystore.properties`).
- Release flow: bump versions in Gradle/`package.json`/`plugin/package.json`;
  update changelog, release notes, landing, market index; test; build APK/AAB and
  SHA-256; push private `main`; export public with
  `node tools/export-public.mjs`; push public; create GitHub pre-release with
  assets; tag `v*` publishes npm through trusted publishing; verify npm, assets,
  Pages.

## Security invariants

- TLS mandatory; app pins our CA; `instanceId` is the CA fingerprint.
- `/dsh-remote` is loopback-only and must return `404` through the gateway.
- `/m` and APIs require a device session; mutations use cookie + CSRF +
  `Sec-Fetch-Site`.
- Pairing is one-time (120 s, attempt/device limits); device TTL 90 days,
  session TTL 8 hours; tokens are stored as digests.
- Cleartext traffic is disabled; WebView external links open in the system browser.

## Known limits

- iOS client does not exist; an iPhone cannot install the APK.
- LAN and tailnet are not combined in one gateway config.
- Session expiry returns to `/mobile-access/login`; restarting the app recovers
  pairing.
- Light DSH theme: Android system status-bar icons are still light; this needs a
  native follow-up.
- Store publication and 1.0 are not authorized.

## Current tasks

- Retest notifications on the Android 17 phone; Realme live question and completion
  already verified.
- Consider replying in Threads that 0.10.0 is out (current post says 0.9.9).
- Keep settings adaptation in the mobile skin; avoid card/right-edge clipping.
- Do not start iOS or store releases without an explicit decision.

## Source-of-truth order

1. Code and this file.
2. `docs/ROUTES.md` for HTTP routes.
3. `README.md` for installation.
4. Release notes for release contents.
5. `ARCHITECTURE.md`, `docs/NEXT.md`, `docs/RELEASE_CHECKLIST.md` are partly
   historical (old versions/names such as package `dsh-remote` or app 0.2.1).
