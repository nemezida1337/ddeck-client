# DDeck

<p align="center"><img src="docs/logo.svg" width="320" alt="DDeck"></p>

**DDeck** is a remote deck for **your own computer** running DeepSeek Harness:
chat with the agent, tools, message queue, files and terminal — from an Android phone.

The computer and phone talk directly over TLS with a pinned certificate. At home this
is the local network; away from home use your Tailscale tailnet or a **self-hosted
VPS relay**. There is no DDeck cloud server in the beta.

[**Download APK**](https://github.com/nemezida1337/ddeck-client/releases/tag/v0.9.2-beta)
· [How to connect](docs/CONNECT.md)
· [Own server](docs/RELAY.md)

> Unofficial client. Not affiliated with or endorsed by DeepSeek.

## Quick start

1. **Download the APK** from the [release](https://github.com/nemezida1337/ddeck-client/releases/tag/v0.9.2-beta)
   and install it on Android 10+ (allow installation from this source).
   Checksum: [`DDeck-0.9.2-beta.apk.sha256`](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.2-beta/DDeck-0.9.2-beta.apk.sha256).
2. **Install the plugin on the Mac**:

   ```sh
   git clone https://github.com/nemezida1337/ddeck-client.git ddeck
   cd ddeck
   ./plugin/install.sh
   ```

3. **Restart DeepSeek Harness** — the **DDeck** panel appears in the DSH UI.
4. Tap **“New code”** in the panel, then **“Scan the QR code from the computer”** on
   the phone.

The QR/code lives for **five minutes** and works once. Do not reuse an old QR — open
the panel and get a fresh code.

## Connect

### Option 1: Tailscale

Turn on Tailscale on both Mac and phone (same tailnet), open the DDeck panel and scan
the QR. The devices reach each other directly.

### Option 2: your own server

If you do not want Tailscale, or it conflicts with another VPN, run **DDeck Relay** on
your own VPS. The plugin keeps a reverse SSH tunnel and the phone connects to the
server's public address. Step-by-step guide: [`docs/RELAY.md`](docs/RELAY.md).

### Option 3: manual

On the connection screen tap **“Enter address and code manually”** and type the
computer address and six-digit code from the panel. Prefer QR/invite when you want a
strictly pinned certificate.

## Features

- chat with the agent, message queue and task stop;
- tools, plugins, scheduled tasks and subagents;
- files, terminal and the right-hand panel;
- briefing and bottom dock in the mobile UI;
- Russian and English interface;
- saved computers and reconnects.

## Requirements

- macOS with DeepSeek Harness (profile `desktop`);
- Android 10+ (phones are the focus; tablets come later);
- Python 3 for the plugin installer (included with macOS Command Line Tools:
  `xcode-select --install`);
- Tailscale **or** an own VPS for access away from home.

Node.js is not required: plugin dependencies are already bundled in `plugin/lib`.

## Update and remove

```sh
./plugin/install.sh      # update the plugin, then restart DSH
./plugin/uninstall.sh    # remove the plugin; pairing data is preserved
```

## Compatibility

Requires DeepSeek Harness with plugin support (`^0.1.5-rc.1 || ^0.2.1-rc.2`);
tested on DSH **0.2.1-rc.5** / macOS. After a major DSH update, check the DDeck panel —
the mobile layer may need a plugin update.

## Beta limitations

- Android only; iOS/iPadOS is planned.
- Not published on Google Play yet.
- Background notifications depend on the Android foreground service.
- Tablet layout is not polished yet.
- Never share QR codes or pairing codes: the app grants remote control of your computer.

## Security and data

- Connection settings and device tokens stay on the devices: on the computer under
  `~/.dsh/dsh-remote`, on the phone encrypted with an Android Keystore key.
- The computer certificate is pinned during pairing.
- No third-party analytics or DDeck servers in the beta.
- An own relay runs on your VPS; traffic uses HTTPS and an SSH tunnel.

## Feedback

Bugs and ideas — [GitHub Issues](https://github.com/nemezida1337/ddeck-client/issues).
Vulnerabilities — privately via Security → Report a vulnerability.

## Repository

- `android/` — Android app;
- `plugin/` — DSH plugin: TLS gateway, `/m` page, mobile layer;
- `docs/` — connection, Tailscale, own server, privacy, security.

## License

Apache-2.0. Vendored gateway transport is Apache-2.0; notices in
[`plugin/NOTICE`](plugin/NOTICE), [`plugin/THIRD-PARTY-LICENSES.md`](plugin/THIRD-PARTY-LICENSES.md)
and [`plugin/vendor/gateway/VENDORED.md`](plugin/vendor/gateway/VENDORED.md).
Android dependencies and licenses are listed in `android/THIRD-PARTY-NOTICES.md`.
