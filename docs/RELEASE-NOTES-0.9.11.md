# DDeck 0.9.11-beta (911)

Уведомления, терминал и мобильные детали.

- Уведомления разделены на каналы `dshm_questions` и `dshm_tasks`; у вопроса
  приоритетнее категория и действие «Открыть», текст включает имя сессии.
- Мост `ui.bars` перекрашивает системный статус-бар под светлую/тёмную тему DSH.
- Кнопка аккаунта в нижней строке подсвечивается, пока открыто меню аккаунта.
- Подготовлены новые экранные снимки: терминал, уведомления, компьютеры,
  второй телефон и нажатое меню; обновлены README и лендинг.
- Версия 0.9.11-beta (911).

## Скачать

- [APK](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.11-beta/DDeck-0.9.11-beta.apk)
- [SHA-256](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.11-beta/DDeck-0.9.11-beta.apk.sha256)
- [AAB](https://github.com/nemezida1337/ddeck-client/releases/download/v0.9.11-beta/DDeck-0.9.11-beta.aab)

## Проверки

- `npm test`: 63/63.
- Android release APK/AAB собраны.
- Уведомления проверены на Realme и OnePlus; на Realme проверены реальные
  фоновые completion и вопрос агента.
