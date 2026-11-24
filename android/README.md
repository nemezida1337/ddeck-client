# Android-приложение DDeck

Два Gradle-модуля:

- **`:protocol`** — Kotlin-клиент шлюза: сопряжение, продление сессии, проксированные
  вызовы, WebSocket, пиннинг CA;
- **`:app`** — оболочка: экран подключения, WebView с интерфейсом DSH, мост
  (уведомления, клавиатура, файлы, вибрация), служба переднего плана.

## Сборка

Нужны JDK 17 и Android SDK 36:

```sh
export JAVA_HOME=/path/to/jdk17
export ANDROID_HOME=/path/to/android-sdk
cd android
./gradlew :app:assembleDebug
```

Release:

```sh
./gradlew :app:assembleRelease :app:bundleRelease
```

Release-подпись берётся из `android/keystore.properties` (в репозиторий не входит,
см. `docs/SIGNING.md`). Без ключа Gradle соберёт **неподписанный** release — такой
APK нельзя публиковать, но можно использовать для локальной проверки.

## Параметры

- `minSdk 29`, `targetSdk 36`, `versionName` — см. `app/build.gradle.kts`;
- `applicationId` — `app.ddeck.client`;
- Kotlin namespace остаётся внутренним (`ai.dshm.client.app`) — это не влияет на
  обновления и package id.

## Проверки

```sh
cd android
./gradlew :app:assembleDebug
```

Полные интеграционные тесты протокола используют dev-фикстуру шлюза и в публичный
бета-репозиторий не входят. Сборка и unit-часть протокола проверяются в dev-контуре.
