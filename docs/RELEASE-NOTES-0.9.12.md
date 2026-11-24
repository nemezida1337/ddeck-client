# DDeck 0.9.12-beta (912)

Патч-релиз совместимости с **DeepSeek Harness 0.2.2-rc.1**. Интерфейс приложения
не менялся относительно 0.9.11; обновление важно для установки плагина на новую
DSH.

## Что изменилось

- `ddeck-remote` объявляет поддержку DSH `0.2.2-alpha.2+` (`engines.dsh`:
  `^0.1.5-rc.1 || ^0.2.1-rc.2 || ^0.2.2-alpha.2`).
- Compatibility preflight DSH 0.2.2 больше не считает плагин несовместимым.
- Проверен удалённый доступ с телефона по воздуху на DSH 0.2.2-rc.1: панель
  DDeck открывается, телефон подключается и работает.
- Документация: совместимость, verification, release notes.

## Установка

- **APK:** `DDeck-0.9.12-beta.apk`, versionCode **912**.
- **Плагин:** `dsh plugin --profile desktop add ddeck-remote@0.9.12-beta`
  или обычный `add ddeck-remote` после публикации в npm.
- После установки плагина полностью перезапустить DSH.

## Проверки

- `npm test` — 63/63.
- DSH 0.2.2-rc.1: плагин загружается, `/dsh-remote` отвечает, удалённый телефон
  работает (ручной smoke пользователя).
- Полный автоматический `phone:all` на выделенном телефоне не повторялся.

## Ссылки

- [GitHub Release](https://github.com/nemezida1337/ddeck-client/releases/tag/v0.9.12-beta)
- [APK](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.12-beta/DDeck-0.9.12-beta.apk)
- [SHA-256](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.12-beta/DDeck-0.9.12-beta.apk.sha256)
- [npm](https://www.npmjs.com/package/ddeck-remote)
