# DDeck 0.9.6-beta (906)

- В меню «Ещё» появился пункт **«Сменить компьютер»**. Он открывает список
  сопряжённых компьютеров и добавление нового по QR/коду, не разрывая текущую
  сессию.
- Телефон теперь удобно хранит несколько компьютеров: Mac, Windows-ноутбук,
  второй сервер.
- Исправлен установщик: профиль с пустым `[]` в `cordis.patch.yml` больше не ломает DSH.
- Исправлено накопление Activity/WebView при переключении компьютеров.
- Версия 0.9.6-beta (906).

## SHA-256

- APK: `b411f4315cd2da5d79ce74c9f8095824e51b07ed16d7f43c60d611d3c3d4c383`
- AAB: `a841c7f662490e16920dcc27c2d7cb5abbd9e8577871c85e81b3270bb155b667`

## Скачать

- [APK 0.9.6-beta](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.6-beta/DDeck-0.9.6-beta.apk)
- [SHA-256](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.6-beta/DDeck-0.9.6-beta.apk.sha256)
- [AAB](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.6-beta/DDeck-0.9.6-beta.aab)

## Проверки

- Release APK/AAB собраны.
- `npm test`: 63/63.
- На Realme проверено переключение Windows ↔ MacBook в обе стороны.
- Публичный и приватный CI зелёные.

> Это GitHub pre-release, не финальная бета и не публикация в магазинах.
