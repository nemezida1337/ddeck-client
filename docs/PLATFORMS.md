# Платформы

DDeck состоит из Android-приложения и плагина DSH на компьютере. Плагин —
обычный Node.js-пакет; установщики и транспорт не привязаны к macOS, хотя
macOS остаётся основной проверенной платформой.

## Матрица

| Компьютер | Плагин | LAN | Tailscale | Свой VPS-релей | Статус |
|---|---|---|---|---|---|
| macOS | `plugin/install.sh` | да | да | `plugin/relay/setup.sh` + LaunchAgent | проверено |
| Linux | `plugin/install.sh` | да | да | `plugin/relay/setup.sh` + nohup | бета, установщик проверяется в CI |
| Windows | `plugin/install.ps1` / `install.cmd` | да | да (Tailscale для Windows) | через WSL/Linux-хост | бета, установка проверяется в CI |

Android-приложение одинаково для всех компьютеров; требования — Android 10+
(`minSdk 29`), arm64.

## macOS

- Python 3 из Command Line Tools: `xcode-select --install`.
- Установка: `./plugin/install.sh`.
- Профиль по умолчанию: `~/.dsh/profiles/desktop`.
- VPS-релей: `plugin/relay/setup.sh` устанавливает LaunchAgent
  `app.ddeck.relay`; перезапуск — `launchctl kickstart -k gui/$(id -u)/app.ddeck.relay`.
- Это эталонная платформа для скриншотов и ручных проверок.

## Linux

- Python 3: `sudo apt install python3` (Debian/Ubuntu) или пакет вашего дистрибутива.
- Установка: `./plugin/install.sh` (тот же скрипт, симлинк).
- VPS-релей: `plugin/relay/setup.sh` использует `nohup` и пишет pid в
  `~/.dsh/dsh-remote/relay-tunnel.pid`; для автозапуска после перезагрузки
  добавьте systemd-user unit самостоятельно.
- Плагин и шлюз — обычный Node.js; отдельных Linux-зависимостей нет.

## Windows

- PowerShell 5.1+ и Node.js в PATH (не обязателен, но нужен для проверки импорта).
- Установка:
  ```powershell
  git clone https://github.com/nemezida1337/ddeck-client.git ddeck
  cd ddeck
  powershell -ExecutionPolicy Bypass -File .\plugin\install.ps1
  ```
  или двойной клик по `plugin\install.cmd`.
- Профиль по умолчанию: `%USERPROFILE%\.dsh\profiles\desktop`.
- Плагин подключается **junction**-ссылкой; администратор не нужен.
- Автоматический VPS-релей `setup.sh` требует WSL или Linux-хост; нативный
  Windows-путь — LAN или Tailscale.
- Установка и удаление проверяются в CI на `windows-latest` в временном
  профиле (не в реальном DSH).

## Установка в нестандартный профиль

```sh
./plugin/install.sh /path/to/profile
# Windows:
powershell -File .\plugin\install.ps1 -Profile C:\Users\me\.dsh\profiles\desktop
```

Явный аргумент имеет приоритет над `DSH_PROFILE`; это исправлено в 0.9.5.

## Что не проверено

- Полный ручной прогон DDeck на Linux и Windows (экраны, уведомления, релей)
  пока не заявлен. Автоматические CI-проверки устанавливают плагин, но не
  заменяют проверку на живом компьютере.
- Автоматический VPS-релей на Windows не поддерживается без WSL.
- Планшетная раскладка Android не полировалась.

## См. также

- [Установка плагина](../plugin/README.md)
- [Tailscale](TAILSCALE.md)
- [Свой сервер](RELAY.md)
