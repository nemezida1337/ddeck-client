# DDeck — плагин (сторона компьютера)

Показывает код подключения, принимает телефон и поднимает TLS-шлюз, через который
приложение DDeck работает с DeepSeek Harness. Ставится в профиль DSH одной командой.

## Установка

Нужны macOS, Python 3 (Command Line Tools) и установленный DeepSeek Harness.

```sh
xcode-select --install              # если Command Line Tools ещё нет
git clone https://github.com/nemezida1337/ddeck-client.git ddeck
cd ddeck
./plugin/install.sh                 # или: DSH_PROFILE=/путь ./plugin/install.sh
```

Скрипт делает три записи профиля (`package.json`, `dsh.profile.bundles`,
`cordis.patch.yml`) и подключает плагин **симлинком** на эту папку. `pnpm`/`npm install`
не нужны: QR и TLS-библиотека уже собраны в `lib/`.

Обновление:

```sh
cd ddeck && git pull && ./plugin/install.sh
```

После установки **полностью перезапустите DeepSeek Harness**. Панель **DDeck**
появится в интерфейсе; в ней нажмите **«Новый код»**.

- повторный запуск обновляет установку;
- `plugin/uninstall.sh` удаляет плагин, не трогая данные сопряжений;
- бэкап профиля — в `~/.dsh/profiles/desktop/.dsh-remote-backups/<дата>`.

## Что появляется

- панель **DDeck** в интерфейсе DSH: QR, шестизначный код, список устройств;
- HTTPS-шлюз на `0.0.0.0:3449` (меняется `DSH_REMOTE_PORT`);
- страница `/m` — мобильный интерфейс для телефона;
- данные сопряжений — в `~/.dsh/dsh-remote`.

## Разработка

```sh
./plugin/install.sh
# зависимости для пересборки бандлов:
cd plugin && npm install
npx esbuild vendor/entry.js --bundle --format=esm --platform=node --target=node20 \
  --outfile=lib/gateway-bundle.js --external:@deepseek-ai/schemastery
```

Правки в `plugin/lib` при установке симлинком видны после перезапуска DSH; мобильный
слой (`lib/mobile/skin.*`) подхватывается при перезагрузке страницы.

## Лицензия

Apache-2.0. Вендоренный транспорт — Apache-2.0 (`NOTICE`, `vendor/gateway/VENDORED.md`);
лицензии встроенных библиотек — в `THIRD-PARTY-LICENSES.md`.
