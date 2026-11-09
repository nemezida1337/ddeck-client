# DDeck 0.9.5-beta (905) — релиз-кандидат

Статус: GitHub pre-release. Не является финальной бетой и не выложен в магазины.

- APK: [DDeck-0.9.5-beta.apk](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.5-beta/DDeck-0.9.5-beta.apk)
- SHA-256: [DDeck-0.9.5-beta.apk.sha256](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.5-beta/DDeck-0.9.5-beta.apk.sha256)
- Плагин: [plugin/README.md](https://github.com/nemezida1337/ddeck-client/blob/main/plugin/README.md)

## Что изменилось

- Приватный CI снова зелёный: обновлён pnpm-lock и проверка версии.
- Android: более аккуратное освобождение WebView при выходе.
- Удалён мёртвый код мобильного слоя, дубли переводов.
- Версия 0.9.5-beta (905) — не финальная бета; 1.0 и магазины после отдельного решения.

## Проверки

- `npm test`: 63/63.
- `npm run verify:standalone`: зелёный.
- Release APK/AAB подписаны, versionCode 905.
