# DDeck 0.9.7-beta (907)

- Исправлен запуск DSH Desktop на Windows после переименования пакета:
  клиентский модуль регистрируется как `ddeck-remote`, без повторов и
  падения web-boot.
- Убрана повторная вставка плагина в профиль DSH.
- Добавлена автопроверка обновлений через GitHub Releases (раз в 12 часов,
  без телеметрии; открывается страница релиза).
- Включены исправления 0.9.6: смена компьютера и отсутствие накопления
  Activity/WebView, установщик с пустым `cordis.patch.yml`.
- Версия 0.9.7-beta (907).

## Скачать

- [APK](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.7-beta/DDeck-0.9.7-beta.apk)
- [SHA-256](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.7-beta/DDeck-0.9.7-beta.apk.sha256)
- [AAB](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.7-beta/DDeck-0.9.7-beta.aab)

## Проверки

- `npm test`: 63/63.
- Android release APK/AAB собраны.
- Windows DSH Desktop запускается без web-boot crash, DDeck-шлюз активен.
