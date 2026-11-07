# DDeck 0.9.9-beta (909)

Полировочный релиз после первых публичных тестов.

## Безопасность и приватность

- `ConnectActivity` больше не запускает pairing из внешних intent-extras
  автоматически: вредоносный explicit intent не может тайно сопрячь телефон с
  подменным шлюзом. Для debug-сборок авто-сопряжение сохранено.
- SSL-pinning пропускает только неизвестный CA; hostname mismatch и истёкший
  сертификат отклоняются.
- Текст страницы больше не пишется в logcat; console-логи — только в debug.
- Миграция device-токенов не удаляет legacy-копию, если зашифрованная запись
  не удалась.

## Надёжность

- Тап по уведомлению возвращает в уже открытую сессию, а не создаёт второй
  WebView/Activity.
- WebView отсоединяется от родителя перед `destroy()`.
- Android 15+ foreground service обрабатывает системный dataSync-timeout.
- Скачивания используют `IS_PENDING` и показывают toast, если уведомления
  отключены.
- Проверка обновлений работает и на экране подключения; неудачный запрос
  кешируется, чтобы не дёргать GitHub на каждом запуске.
- Внешние ссылки открываются через защищённый `runCatching`, без падения на
  устройстве без браузера.

## Документация и UI

- Лендинг стал компактнее: компьютеры, переключение, подключение второго
  телефона, установка и roadmap.
- Добавлены [ROADMAP.md](ROADMAP.md) и гайд [GETTING-STARTED.md](GETTING-STARTED.md).
- README: исправлены якоря, профили установки, шаг перезапуска DSH и настройка
  пароля для второго телефона.
- CHANGELOG приведён в порядок: выпущенные версии больше не «в подготовке».

## SHA-256

- APK: `484edec6a2e30546b19fd675e147477d1c17fb5a3922f2cdefb06a387f2dcfda`
- AAB: `12bc795ed97c4bb3cfbb2f95423f462e0eb5cf2de92e9c7d16f7d7ebb5ca3394`

## Скачать

- [APK](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.9-beta/DDeck-0.9.9-beta.apk)
- [SHA-256](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.9-beta/DDeck-0.9.9-beta.apk.sha256)
- [AAB](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.9-beta/DDeck-0.9.9-beta.aab)

## Проверки

- `npm test`: 63/63.
- Android compile/lint/release build.
- APK/AAB собраны и проверены на Realme.
