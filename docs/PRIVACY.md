# Политика конфиденциальности · Privacy Policy

**DDeck** — мобильный клиент DeepSeek Harness

**Приложение:** DDeck (пакет `app.ddeck.client`)
**Дата:** 31 октября 2026 г. (бета 0.9.2-beta)

## Коротко

Приложение — это пульт к **вашему собственному** компьютеру с DeepSeek Harness.
У разработчика нет ни серверов, ни аналитики, ни рекламы: приложение не отправляет
ему ничего и не собирает о вас ничего. Все данные остаются на телефоне и уходят
только на тот компьютер, который вы сами указали.

## Какие данные приложение хранит на телефоне

| Что | Зачем | Где |
|---|---|---|
| Адрес компьютера (например `https://192.168.1.10:3449`) и его название | чтобы подключиться к нему снова | на телефоне, в зашифрованном виде |
| Ключ устройства (device token) | заменяет пароль: по нему компьютер узнаёт телефон | на телефоне, зашифрован AES-256-GCM, ключ шифрования — в Android Keystore и не покидает устройство |
| Сертификат компьютера (CA) | чтобы замечать подмену компьютера в сети | на телефоне, в зашифрованном виде |

Эти данные не покидают телефон. Их нельзя прочитать, скопировав файлы приложения
на другое устройство: ключ шифрования хранится в аппаратном хранилище ключей
Android.

## Какие данные куда передаются

- **На ваш компьютер** — то, что вы делаете в интерфейсе: сообщения, команды,
  файлы. Приложение открывает интерфейс, который отдаёт ваш компьютер, и передаёт
  ему ваши действия. Это тот же обмен, что и в браузере на вашем компьютере.
- **Через вашу сеть** (если используете удалённый доступ) — либо напрямую по
  Tailscale (соединение идёт между вашими устройствами или через инфраструктуру
  Tailscale), либо через **ваш собственный VPS/relay**: сервер администрируете вы,
  отдельного сервера DDeck у разработчика нет.
- **Разработчику приложения — ничего.** В приложении нет аналитики, отчётов о
  сбоях, рекламных и иных SDK, отправляющих данные третьим лицам.

## Разрешения и что они делают

| Разрешение | Когда используется |
|---|---|
| `INTERNET` | соединение с вашим компьютером |
| `VIBRATE` | короткий тактильный отклик на кнопки дока |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC` | удержать сессию в фоне, пока ждём завершения задачи |
| `CAMERA` | только когда вы нажимаете «Сканировать QR с компьютера»: читается QR-код приглашения |
| `POST_NOTIFICATIONS` | локальные уведомления о завершении задачи; текст готовит ваш компьютер, уведомление не покидает телефон |

## Чего приложение не делает

- не ищет компьютеры в сети без вашего действия и не рассылает данные по локальной
  сети (обнаружение в этой бете выключено);
- не собирает контакты, местоположение, идентификаторы устройства и рекламы;
- не отправляет ваши сообщения и содержимое сессий разработчику или третьим лицам;
- не устанавливает и не выполняет код, полученный от разработчика. Приложение
  показывает интерфейс, который отдаёт **ваш** компьютер; этот интерфейс —
  программа с вашей машины, и вы её владелец.

## Дети

Приложение не предназначено для детей и не адресовано им.

## Удаление данных

- «Забыть» рядом с компьютером удаляет запись о нём с телефона.
- Удаление приложения удаляет всё: записи о компьютерах и ключ шифрования в
  Keystore. Восстановить их нельзя, потребуется сопряжение заново.
- Чтобы отозвать доступ устройства на компьютере, удалите его в панели
  «DDeck» на самом компьютере — это отдельное действие, и приложение
  не может его отменить.

## Изменения

Если политика изменится, новая версия появится по этому же адресу с новой датой.

## Контакт

Вопросы и сообщения об уязвимостях: [приватный security advisory на GitHub](https://github.com/nemezida1337/ddeck-client/security/advisories/new).

---

# Privacy Policy (English summary)

DDeck (`app.ddeck.client`) is a remote control for **your own** computer
running DeepSeek Harness. The developer operates no servers and collects nothing:
there is no analytics, no crash reporting and no advertising SDK in the app.

- **Stored on the phone only:** the computer's address and name, the device token
  and its pinned certificate. The token and certificate are encrypted with
  AES-256-GCM under a key held in the Android Keystore, which never leaves the
  device.
- **Sent to:** your computer (the messages and commands you type, exactly as a
  browser on that computer would), and — only if you use remote access — over
  your own Tailscale tailnet or through your own VPS relay. The developer operates
  no relay server of its own.
- **Sent to the developer:** nothing.
- **Permissions:** network (connection), camera (only when you tap "Scan QR"),
  notifications (local task notifications prepared by your computer), vibration
  (dock button feedback), and a data-sync foreground service while a task runs
  in the background.
- **Deleting data:** "Forget" removes one computer from the phone; uninstalling the
  app removes everything, including the Keystore key. Revoking the device on the
  computer is a separate action performed there.
- **Children:** not directed at children.
- **Contact:** [private security advisory on GitHub](https://github.com/nemezida1337/ddeck-client/security/advisories/new)
