
/** Язык панели: русский или английский. */
function uiLang() {
  let raw = ''
  try { raw = new URLSearchParams(location.search).get('lang') || '' } catch { raw = '' }
  raw = raw || document.documentElement.getAttribute('lang') || navigator.language || 'ru'
  return raw.toLowerCase().startsWith('en') ? 'en' : 'ru'
}

/** Английские строки панели; ключ — русский текст. */
const EN_TEXT = {
  'Загружаем…': 'Loading…',
  'Не удалось получить код': 'Could not get the code',
  'Проверьте журнал DSH.': 'Check the DSH log.',
  'Подключить ещё один телефон': 'Connect another phone',
  'Подключить телефон': 'Connect phone',
  'Новый код': 'New code',
  'Откройте DDeck на телефоне и наведите камеру на код.': 'Open DDeck on your phone and point it at the code.',
  'Пока ни одного устройства.': 'No devices yet.',
  'Подключено:': 'Connected:',
  'и ещё': 'and more:',
  'телефон': 'phone',
  'Отключить': 'Disconnect',
  'Закрыть': 'Close',
  'Код действует до': 'Code expires at',
  'Не удалось получить код (': 'Could not get the code (',
  'Как подключиться?': 'How to connect?',
  'Свой сервер': 'Own server',
  'Введите адрес VPS или SSH-хост из ~/.ssh/config. Публичный адрес и туннель настроятся сами.': 'Enter a VPS address or an SSH host from ~/.ssh/config. The public address and tunnel will be configured automatically.',
  'Сейчас:': 'Current:',
  'туннель активен': 'tunnel active',
  'Настроить сервер': 'Set up server',
  'Настраиваю…': 'Setting up…',
  'Ошибка': 'Error',
  'Полная инструкция': 'Full guide',
  'Понятно': 'Got it',
  '1. На компьютере откройте DSH → панель «DDeck».': '1. On the computer open DSH → the “DDeck” panel.',
  '2. Включите Tailscale или поднимите свой сервер (docs/RELAY).': '2. Turn on Tailscale or set up your own server (docs/RELAY).',
  '3. Нажмите «Новый код» и отсканируйте QR телефоном.': '3. Tap “New code” and scan the QR with the phone.',
  'Код живёт 5 минут. Старый QR не подойдёт — возьмите свежий.': 'The code lives for five minutes. An old QR will not work — get a fresh one.',
  'Ошибка про отпечаток: «Забыть» старый компьютер и сопрягите заново.': 'Fingerprint error: forget the old computer and pair again.',
  'Timeout: проверьте, что Mac не спит, DSH запущен, Tailscale/сервер доступен.': 'Timeout: check the Mac is awake, DSH is running and Tailscale/your server is reachable.',
  'Шлюз не запущен — этот код не сработает. Перезапустите DSH и откройте панель заново.': 'The gateway is not running — this code will not work. Restart DSH and reopen the panel.',
  'Второй телефон': 'Second phone',
  'Пароль задан. На телефоне откройте «Подключить телефон» и введите его.': 'The password is set. On the phone open “Connect a phone” and enter it.',
  'Задайте пароль, чтобы подключить второй телефон с первого. Без пароля это окно закрыто.': 'Set a password to connect a second phone from the first. Without it this window stays closed.',
  'Пароль от 6 до 64 символов': 'Password, 6 to 64 characters',
  'Сохранить пароль': 'Save password',
  'Сохраняю…': 'Saving…',
  'Пароль сохранён. Теперь его можно ввести на телефоне.': 'Password saved. You can now enter it on the phone.',
}

/** @param {string} text русская подпись. @returns {string} подпись на языке панели. */
function tr(text) {
  return uiLang() === 'en' ? (EN_TEXT[text] ?? text) : text
}

/** Экранировать строку для вставки в innerHTML. */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]))
}

/**
 * DDeck — панель внутри приложения.
 *
 * Человек не должен искать адрес и открывать браузер: панель живёт там же, где настройки,
 * и показывает то, что нужно в этот момент — код, если телефон ещё не подключён, или
 * список подключённых, если он уже подключён.
 *
 * Это клиентская половина плагина. Она не рисует интерфейс заново: данные берутся с того
 * же маршрута плагина (`/dsh-remote/pairing`), который отдаёт страницу, поэтому панель и
 * страница не могут разойтись.
 *
 * @module dsh-remote/client
 */
window.__ModuleLoader__.load({
  // Модуль обязан представиться ровно именем пакета: клиентский загрузчик сверяет
  // зарегистрированный id с найденным package.json и иначе отказывается грузить модуль.
  id: 'ddeck-remote',
  factory: (require) => {
    const HELP_URL = 'https://github.com/nemezida1337/ddeck-client/blob/main/docs/CONNECT.md'
    const HELP_STEPS = [
      '1. На компьютере откройте DSH → панель «DDeck».',
      '2. Включите Tailscale или поднимите свой сервер (docs/RELAY).',
      '3. Нажмите «Новый код» и отсканируйте QR телефоном.',
    ]
    const HELP_TROUBLE = [
      'Код живёт 5 минут. Старый QR не подойдёт — возьмите свежий.',
      'Ошибка про отпечаток: «Забыть» старый компьютер и сопрягите заново.',
      'Timeout: проверьте, что Mac не спит, DSH запущен, Tailscale/сервер доступен.',
    ]
    const module = { exports: {} }
    const react = require('react')
    const h = react.createElement

    /** Стили карточки: держим их при ней, чтобы панель не зависела от темы приложения. */
    const STYLE = {
      row: { display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.25rem 0' },
      head: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem' },
      title: { fontWeight: 600 },
      note: { opacity: 0.72, fontSize: '0.875rem' },
      qr: { width: '10rem', height: '10rem', background: '#fff', padding: '0.5rem', borderRadius: '0.75rem', lineHeight: 0 },
      code: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '1.5rem', letterSpacing: '0.28em' },
      button: { alignSelf: 'flex-start', padding: '0.4375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid currentColor', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '0.875rem' },
      cell: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8125rem', wordBreak: 'break-all' },
    }

    /** Стили панели DDeck; одна инъекция на окно DSH. */
    const PANEL_CSS = `
      .dshm-dsh-panel {
        position: fixed; z-index: 1200; left: 50%; top: 50%; transform: translate(-50%, -50%);
        width: min(34rem, calc(100vw - 2rem)); max-height: min(46rem, calc(100vh - 2rem));
        overflow: auto; box-sizing: border-box; padding: 0;
        background: #1a1b1f; color: #f5f6f8;
        border: 1px solid #30323a; border-radius: 1rem;
        box-shadow: 0 24px 80px rgba(0,0,0,.55);
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      .dshm-dsh-panel, .dshm-dsh-panel * { box-sizing: border-box; }
      .dshm-dsh-scrim { position: fixed; z-index: 1190; inset: 0; border: 0; padding: 0;
        background: rgba(8,9,12,.58); backdrop-filter: blur(3px); }
      .dshm-dsh-head { display: flex; align-items: flex-start; justify-content: space-between;
        gap: 1rem; padding: 1.25rem 1.375rem 1rem; border-bottom: 1px solid #2b2d34; }
      .dshm-dsh-brand { display: flex; align-items: center; gap: .7rem; min-width: 0; }
      .dshm-dsh-mark { width: 2.4rem; height: 2.4rem; border-radius: .7rem; display: grid; place-items: center;
        background: #252833; border: 1px solid #353947; color: #dbe2ff; flex: none; }
      .dshm-dsh-title { font-size: 1.05rem; font-weight: 650; line-height: 1.2; }
      .dshm-dsh-sub { margin-top: .15rem; color: #969aa8; font-size: .8125rem; }
      .dshm-dsh-head-actions { display: flex; align-items: center; gap: .5rem; flex: none; }
      .dshm-dsh-close { width: 2.25rem; height: 2.25rem; border-radius: .55rem; border: 1px solid #343743;
        background: transparent; color: #b9bdc9; font-size: 1.2rem; line-height: 1; cursor: pointer; }
      .dshm-dsh-close:hover { background: #292c35; color: #fff; }
      .dshm-dsh-body { padding: 1.125rem 1.375rem 1.25rem; display: flex; flex-direction: column; gap: 1.1rem; }
      .dshm-dsh-pair { display: grid; grid-template-columns: 10.5rem minmax(0, 1fr); gap: 1.2rem; align-items: center; }
      .dshm-dsh-qr { width: 10.5rem; height: 10.5rem; padding: .45rem; border-radius: .85rem; background: #fff; line-height: 0; }
      .dshm-dsh-qr svg { display: block; width: 100%; height: 100%; }
      .dshm-dsh-qr-hint { margin-top: .5rem; color: #898e9c; font-size: .75rem; line-height: 1.35; }
      .dshm-dsh-kicker { color: #8f94a3; font-size: .6875rem; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; }
      .dshm-dsh-code { margin-top: .2rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 2.15rem; font-weight: 600; letter-spacing: .06em; line-height: 1.15; color: #fff; }
      .dshm-dsh-expiry { margin-top: .25rem; color: #969aa8; font-size: .8125rem; }
      .dshm-dsh-instruct { margin: 0; color: #b9becb; font-size: .84rem; line-height: 1.45; }
      .dshm-dsh-url { margin-top: .55rem; padding: .45rem .55rem; border-radius: .5rem; background: #121318;
        border: 1px solid #2b2e38; color: #c8ccda; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: .72rem; overflow-wrap: anywhere; }
      .dshm-dsh-actions { margin-top: .7rem; display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
      .dshm-dsh-status { display: inline-flex; align-items: center; gap: .4rem; color: #a6d7a9; font-size: .78rem; }
      .dshm-dsh-status.bad { color: #e7a3a3; }
      .dshm-dsh-dot { width: .42rem; height: .42rem; border-radius: 50%; background: currentColor; flex: none; }
      .dshm-dsh-warning { margin: 0; padding: .65rem .75rem; border: 1px solid #6d4545; border-radius: .6rem;
        background: #2a1d1f; color: #e7b1b1; font-size: .82rem; line-height: 1.4; }
      .dshm-dsh-section-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .55rem; }
      .dshm-dsh-section-title { font-size: .82rem; font-weight: 650; color: #d7dae3; }
      .dshm-dsh-count { min-width: 1.4rem; padding: .1rem .45rem; border-radius: 999px; background: #292c35;
        color: #b9becb; font-size: .72rem; text-align: center; }
      .dshm-dsh-devices { display: flex; flex-direction: column; gap: .4rem; }
      .dshm-dsh-device { display: flex; align-items: center; gap: .65rem; min-height: 2.6rem; padding: .45rem .65rem;
        border: 1px solid #2d3039; border-radius: .65rem; background: #1d1f25; }
      .dshm-dsh-device-dot { width: .45rem; height: .45rem; border-radius: 50%; background: #86d69a; flex: none; }
      .dshm-dsh-device-main { min-width: 0; flex: 1 1 auto; }
      .dshm-dsh-device-name { font-size: .84rem; color: #eef0f6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dshm-dsh-device-meta { margin-top: .1rem; color: #8f94a3; font-size: .72rem; }
      .dshm-dsh-empty { margin: 0; padding: .7rem .8rem; border: 1px dashed #393c47; border-radius: .6rem;
        color: #9ba0ae; font-size: .82rem; }
      .dshm-dsh-rest { margin: .4rem 0 0; color: #828796; font-size: .75rem; }
      .dshm-dsh-links { display: flex; flex-wrap: wrap; gap: .35rem 1rem; padding-top: .9rem; border-top: 1px solid #2b2d34; }
      .dshm-dsh-link { border: 0; padding: 0; background: transparent; color: #aeb4c4; font: inherit;
        font-size: .8rem; text-decoration: underline; text-underline-offset: .15rem; cursor: pointer; }
      .dshm-dsh-link:hover { color: #fff; }
      .dshm-dsh-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 2.25rem;
        padding: .35rem .7rem; border-radius: .55rem; font: inherit; font-size: .82rem; cursor: pointer;
        border: 1px solid #3a3e4a; background: transparent; color: #e8eaf0; }
      .dshm-dsh-btn:hover { background: #292c35; }
      .dshm-dsh-btn.primary { background: #6b8afd; border-color: #6b8afd; color: #fff; font-weight: 600; }
      .dshm-dsh-btn.primary:hover { background: #5d7cf0; }
      .dshm-dsh-btn.danger { color: #e7a3a3; font-size: .75rem; }
      .dshm-dsh-btn:disabled { opacity: .5; cursor: default; }
      .dshm-dsh-form { padding: .9rem; border: 1px solid #2d3039; border-radius: .75rem; background: #1c1e24;
        display: flex; flex-direction: column; gap: .55rem; }
      .dshm-dsh-form-title { font-size: .86rem; font-weight: 650; }
      .dshm-dsh-note { margin: 0; color: #9ba0ae; font-size: .8rem; line-height: 1.45; }
      .dshm-dsh-input { width: 100%; padding: .55rem .6rem; border-radius: .5rem; border: 1px solid #3a3e4a;
        background: #15171c; color: #f5f6f8; font: inherit; font-size: .84rem; outline: none; }
      .dshm-dsh-input:focus { border-color: #6b8afd; box-shadow: 0 0 0 3px rgba(107,138,253,.15); }
      .dshm-dsh-form-actions { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
      .dshm-dsh-help { position: fixed; z-index: 9999; inset: 0; background: rgba(0,0,0,.62);
        display: flex; align-items: center; justify-content: center; padding: 1rem; }
      .dshm-dsh-help-card { width: min(30rem, calc(100vw - 2rem)); max-height: calc(100vh - 2rem); overflow: auto;
        background: #1b1d22; border: 1px solid #343743; border-radius: .9rem; padding: 1.1rem 1.2rem;
        display: flex; flex-direction: column; gap: .65rem; box-shadow: 0 24px 80px rgba(0,0,0,.5); }
      .dshm-dsh-help-title { font-size: 1rem; font-weight: 650; }
      .dshm-dsh-divider { height: 1px; background: #2b2d34; margin: .1rem 0; }
      @media (max-width: 560px) {
        .dshm-dsh-panel { width: calc(100vw - 1rem); max-height: calc(100vh - 1rem); }
        .dshm-dsh-head { padding: 1rem 1rem .85rem; }
        .dshm-dsh-body { padding: 1rem; gap: .9rem; }
        .dshm-dsh-pair { grid-template-columns: 7.6rem minmax(0, 1fr); gap: .8rem; }
        .dshm-dsh-qr { width: 7.6rem; height: 7.6rem; }
        .dshm-dsh-code { font-size: 1.7rem; }
        .dshm-dsh-qr-hint { display: none; }
      }
    `

    /** Вставить стили панели один раз. */
    function injectPanelStyles() {
      if (document.getElementById('dshm-dsh-styles') !== null) return
      const style = document.createElement('style')
      style.id = 'dshm-dsh-styles'
      style.textContent = PANEL_CSS
      document.head.appendChild(style)
    }

    /** Мини-визард «Свой сервер»: один адрес, остальное — автоматически. */
    function ServerForm({ onDone }) {
      const [address, setAddress] = react.useState('')
      const [status, setStatus] = react.useState(null)
      const [message, setMessage] = react.useState('')
      const [busy, setBusy] = react.useState(false)
      react.useEffect(() => {
        let alive = true
        fetch('/dsh-remote/server', { cache: 'no-store' })
          .then((response) => response.ok ? response.json() : null)
          .then((data) => { if (alive) setStatus(data) })
          .catch(() => {})
        return () => { alive = false }
      }, [])
      const hosts = Array.isArray(status?.sshHosts) ? status.sshHosts : []
      const submit = async () => {
        setBusy(true)
        setMessage(tr('Настраиваю…'))
        try {
          const response = await fetch('/dsh-remote/server', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ address: address.trim() }),
          })
          const data = await response.json().catch(() => ({}))
          if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`)
          setBusy(false)
          setMessage((data.steps || []).join(' → ') || 'Готово: сервер настроен.')
          onDone?.()
        } catch (error) {
          setBusy(false)
          setMessage(`${tr('Ошибка')}: ${String(error instanceof Error ? error.message : error)}`)
        }
      }
      return h('div', { style: { border: '1px solid #2b2d34', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' } },
        h('div', { style: STYLE.title }, tr('Свой сервер')),
        h('div', { style: STYLE.note }, tr('Введите адрес VPS или SSH-хост из ~/.ssh/config. Публичный адрес и туннель настроятся сами.')),
        status?.origin ? h('div', { style: STYLE.note }, `${tr('Сейчас:')} ${status.origin}${status.tunnel ? ` · ${tr('туннель активен')}` : ''}`) : null,
        h('input', {
          value: address,
          list: 'dsh-ssh-hosts',
          placeholder: 'relay.example.com или relay-vds',
          onChange: (event) => setAddress(event.target.value),
          style: { padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #2b2d34', background: '#12151C', color: '#f5f6f8' },
        }),
        h('datalist', { id: 'dsh-ssh-hosts' }, ...hosts.map((host) => h('option', { key: host.alias, value: host.alias }, host.host))),
        h('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' } },
          h('button', { type: 'button', style: { ...STYLE.button, background: '#6B8AFD', borderColor: '#6B8AFD', color: '#fff' }, disabled: busy, onClick: submit }, busy ? tr('Настраиваю…') : tr('Настроить сервер')),
          h('button', { type: 'button', style: STYLE.button, onClick: () => onDone?.() }, tr('Закрыть'))),
        message === '' ? null : h('div', { style: { ...STYLE.note, whiteSpace: 'pre-wrap', maxHeight: '9rem', overflow: 'auto' } }, message),
      )
    }

    /** Пароль для подключения второго телефона с уже подключённого. */
    function MobilePairForm({ onDone }) {
      const [password, setPassword] = react.useState('')
      const [configured, setConfigured] = react.useState(null)
      const [message, setMessage] = react.useState('')
      const [busy, setBusy] = react.useState(false)
      react.useEffect(() => {
        let alive = true
        fetch('/dsh-remote/mobile-pin', { cache: 'no-store' })
          .then((response) => response.ok ? response.json() : null)
          .then((data) => { if (alive) setConfigured(data?.set === true) })
          .catch(() => {})
        return () => { alive = false }
      }, [])
      const submit = async () => {
        setBusy(true)
        setMessage(tr('Сохраняю…'))
        try {
          const response = await fetch('/dsh-remote/mobile-pin', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ password }),
          })
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`)
          setConfigured(true)
          setPassword('')
          setMessage(tr('Пароль сохранён. Теперь его можно ввести на телефоне.'))
          onDone?.()
        } catch (error) {
          setMessage(`${tr('Ошибка')}: ${String(error instanceof Error ? error.message : error)}`)
        } finally {
          setBusy(false)
        }
      }
      return h('div', { style: { border: '1px solid #2b2d34', borderRadius: '0.75rem', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' } },
        h('div', { style: STYLE.title }, tr('Второй телефон')),
        h('div', { style: STYLE.note }, configured === true
          ? tr('Пароль задан. На телефоне откройте «Подключить телефон» и введите его.')
          : tr('Задайте пароль, чтобы подключить второй телефон с первого. Без пароля это окно закрыто.')),
        h('input', {
          type: 'password',
          value: password,
          autoComplete: 'new-password',
          placeholder: tr('Пароль от 6 до 64 символов'),
          onChange: (event) => setPassword(event.target.value),
          style: { padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #2b2d34', background: '#12151C', color: '#f5f6f8' },
        }),
        h('div', { style: { display: 'flex', gap: '0.5rem' } },
          h('button', { type: 'button', style: { ...STYLE.button, background: '#6B8AFD', borderColor: '#6B8AFD', color: '#fff' }, disabled: busy || password.length < 6, onClick: submit }, busy ? tr('Сохраняю…') : tr('Сохранить пароль')),
          h('button', { type: 'button', style: STYLE.button, onClick: () => onDone?.() }, tr('Закрыть'))),
        message === '' ? null : h('div', { style: STYLE.note }, message),
      )
    }

    /**
     * Панель «DDeck».
     *
     * Состояние одно и берётся целиком с сервера: тип устройства, код и адрес приходят
     * вместе, иначе панель могла бы показать код от одного шлюза с адресом другого.
     */
    function RemoteRow() {
      const [state, setState] = react.useState({ status: 'loading' })
      const [help, setHelp] = react.useState(false)
      const [serverOpen, setServerOpen] = react.useState(false)
      const [pinOpen, setPinOpen] = react.useState(false)
      // Язык DSH может смениться без перезагрузки — перерисовываем подписи.
      react.useEffect(() => {
        const observer = new MutationObserver(() => setState((current) => ({ ...current })))
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
        return () => observer.disconnect()
      }, [])

      const load = react.useCallback((force = false) => {
        let alive = true
        fetch('/dsh-remote/pairing', { cache: 'no-store', method: force ? 'POST' : 'GET' })
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
          .then((data) => { if (alive) setState({ status: 'ready', data }) })
          .catch((error) => { if (alive) setState({ status: 'error', message: String(error.message ?? error) }) })
        return () => { alive = false }
      }, [])

      react.useEffect(() => {
        const cancel = load()
        // Код живёт пять минут; панель сама меняет его к истечению и обновляет список
        // устройств раз в минуту. «Обновить» рядом с QR — принудительная смена кода.
        const timer = setInterval(() => load(false), 60000)
        return () => { clearInterval(timer); cancel() }
      }, [load])

      // Когда код истекает, сразу открываем новое окно: старый QR на экране бесполезен.
      const expiresAt = state.status === 'ready' ? Number(state.data?.expiresAt ?? 0) : 0
      react.useEffect(() => {
        if (expiresAt <= 0) return undefined
        const delay = Math.max(1000, expiresAt - Date.now() - 2000)
        const timer = setTimeout(() => load(true), delay)
        return () => clearTimeout(timer)
      }, [expiresAt, load])

      if (state.status === 'loading') {
        return h('div', { style: STYLE.row, 'data-dshm-desktop-settings': '' }, h('div', { style: STYLE.note }, tr('Загружаем…')))
      }
      if (state.status === 'error') {
        return h('div', { style: STYLE.row, 'data-dshm-desktop-settings': '' },
          h('div', { style: STYLE.title }, 'DDeck'),
          h('div', { style: STYLE.note }, `${tr('Не удалось получить код')} (${state.message}). ${tr('Проверьте журнал DSH.')}`))
      }

      const { data } = state
      const devices = Array.isArray(data.devices) ? data.devices : []
      const expiresLabel = Number(data.expiresAt) > 0
        ? `${tr('Код действует до')} ${new Date(Number(data.expiresAt)).toLocaleTimeString(uiLang() === 'en' ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}`
        : ''

      const revoke = (deviceId) => {
        fetch('/dsh-remote/revoke', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        }).then(() => load()).catch(() => {})
      }

      return h('div', { style: STYLE.row, 'data-dshm-desktop-settings': '' },
        data.gateway === false
          ? h('div', { style: { ...STYLE.note, color: '#e0a3a3', border: '1px solid #7a4a4a', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' } },
            tr('Шлюз не запущен — этот код не сработает. Перезапустите DSH и откройте панель заново.'))
          : null,
        h('div', { style: STYLE.head },
          h('div', { style: STYLE.title }, devices.length > 0 ? tr('Подключить ещё один телефон') : tr('Подключить телефон')),
          h('button', { type: 'button', style: STYLE.button, onClick: () => load(true) }, tr('Новый код'))),
        h('div', { style: STYLE.note }, tr('Откройте DDeck на телефоне и наведите камеру на код.')),
        h('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } },
          h('button', { type: 'button', style: STYLE.button, onClick: () => setHelp(true) }, tr('Как подключиться?')),
          h('button', { type: 'button', style: STYLE.button, onClick: () => setServerOpen((open) => !open) }, tr('Свой сервер')),
          h('button', { type: 'button', style: STYLE.button, onClick: () => setPinOpen((open) => !open) }, tr('Второй телефон'))),
        serverOpen ? h(ServerForm, { onDone: () => { setServerOpen(false); load(true) } }) : null,
        pinOpen ? h(MobilePairForm, { onDone: () => setPinOpen(false) }) : null,
        help ? h('div', {
          role: 'dialog',
          'aria-label': tr('Как подключиться?'),
          style: { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
          onClick: (event) => { if (event.target === event.currentTarget) setHelp(false) },
        }, h('div', {
          style: { maxWidth: '26rem', width: '100%', background: '#1b1b1c', color: '#f5f6f8', border: '1px solid #2b2d34', borderRadius: '1rem', padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' },
        },
          h('div', { style: { ...STYLE.title, fontSize: '1.05rem' } }, tr('Как подключиться?')),
          ...HELP_STEPS.map((line) => h('div', { key: line, style: STYLE.note }, tr(line))),
          h('div', { style: { height: '1px', background: '#2b2d34', margin: '0.25rem 0' } }),
          ...HELP_TROUBLE.map((line) => h('div', { key: line, style: STYLE.note }, tr(line))),
          h('div', { style: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' } },
            h('a', { href: HELP_URL, target: '_blank', rel: 'noreferrer', style: { ...STYLE.button, textDecoration: 'none' } }, tr('Полная инструкция')),
            h('button', { type: 'button', style: { ...STYLE.button, background: '#6B8AFD', borderColor: '#6B8AFD', color: '#fff' }, onClick: () => setHelp(false) }, tr('Понятно'))),
        )) : null,
        expiresLabel === '' ? null : h('div', { style: { ...STYLE.note, fontSize: '0.75rem' } }, expiresLabel),
        // QR виден всегда: «подключить второй телефон» — обычное дело, и прятать код за
        // дополнительным нажатием значит заставлять человека искать его.
        h('div', {
          style: STYLE.qr,
          dangerouslySetInnerHTML: { __html: typeof data.qrSvg === 'string' ? data.qrSvg : '' },
        }),
        h('div', { style: STYLE.code }, String(data.code ?? '')),
        h('div', { style: STYLE.cell }, (() => {
          const origins = Array.isArray(data.origins) && data.origins.length > 0 ? data.origins : [data.origin]
          return origins.filter(Boolean).join('  ·  ')
        })()),
        devices.length === 0
          ? h('div', { style: STYLE.note }, tr('Пока ни одного устройства.'))
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.375rem' } },
            h('div', { style: STYLE.note }, `${tr('Подключено:')} ${devices.length}`),
            ...devices.map((device) => h('div', {
              key: device.id,
              style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                padding: '0.375rem 0.5rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem' },
            },
              h('span', { style: { fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, String(device.label ?? tr('телефон'))),
              h('button', { type: 'button', style: { ...STYLE.button, padding: '0.1875rem 0.5rem', fontSize: '0.75rem' }, onClick: () => revoke(device.id) }, tr('Отключить')))),
          ),
      )
    }

    /**
     * Кнопка в подвале боковой панели и панель поверх интерфейса.
     *
     * Панель висит на `document.body`, а не рядом с кнопкой: кнопка живёт внутри боковой
     * панели, которую на телефоне сдвигают за край экрана, и панель уезжала вместе с ней
     * (замер: x = −297 при экране 360). Отдельный элемент на body не зависит от того,
     * что делает drawer.
     */
    const PANEL_ID = 'dshm-remote-panel'
    const SCRIM_ID = 'dshm-remote-scrim'

    /** Затемнение под панелью: модальное окно должно читаться как модальное. */
    function scrimElement(onClose) {
      let scrim = document.getElementById(SCRIM_ID)
      if (scrim !== null) return scrim
      scrim = document.createElement('button')
      scrim.id = SCRIM_ID
      scrim.type = 'button'
      scrim.setAttribute('aria-label', tr('Закрыть'))
      scrim.className = 'dshm-dsh-scrim'
      scrim.style.display = 'none'
      scrim.addEventListener('click', onClose)
      document.body.appendChild(scrim)
      return scrim
    }

    /** Панель: создаётся один раз, дальше только обновляется содержимое. */
    function panelElement() {
      let panel = document.getElementById(PANEL_ID)
      if (panel !== null) return panel
      injectPanelStyles()
      panel = document.createElement('div')
      panel.id = PANEL_ID
      panel.className = 'dshm-dsh-panel'
      panel.setAttribute('role', 'dialog')
      panel.setAttribute('aria-modal', 'true')
      panel.setAttribute('aria-label', 'DDeck')
      panel.style.display = 'none'
      document.body.appendChild(panel)
      return panel
    }

    /** Перерисовать панель по данным плагина. */
    function fillPanel(panel, data, onRevoke, onClose) {
      // Панель опрашивает сервер раз в две секунды. Полная замена innerHTML на
      // каждом тике сбрасывала фокус/выделение и закрывала раскрытые контролы
      // (так «Дополнительно» открывалось и мгновенно закрывалось). Перерисовываем
      // только когда данные действительно изменились; язык входит в подпись,
      // чтобы live-переключение RU/EN обновляло подписи.
      const signature = JSON.stringify({
        code: data.code,
        expiresAt: data.expiresAt,
        devices: Array.isArray(data.devices) ? data.devices.map((device) => [device.id, device.label, device.lastSeenAt]) : [],
        gateway: data.gateway,
        lang: uiLang(),
      })
      if (panel.dataset.dshmSignature === signature) return
      panel.dataset.dshmSignature = signature
      injectPanelStyles()
      const gatewayDown = data.gateway === false
      const devices = (Array.isArray(data.devices) ? data.devices : [])
        .slice()
        .sort((a, b) => Number(b.lastSeenAt ?? 0) - Number(a.lastSeenAt ?? 0))
      const shown = devices.slice(0, 5)
      const rest = devices.length - shown.length
      const origins = (Array.isArray(data.origins) && data.origins.length > 0 ? data.origins : [data.origin])
        .filter(Boolean)
        .join(' · ')
      const rawCode = String(data.code ?? '')
      const code = /^\d{6}$/u.test(rawCode) ? `${rawCode.slice(0, 3)} ${rawCode.slice(3)}` : rawCode
      const expires = Number(data.expiresAt) > 0
        ? `${tr('Код действует до')} ${new Date(Number(data.expiresAt)).toLocaleTimeString(uiLang() === 'en' ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}`
        : ''
      const lastSeen = (value) => {
        const numeric = Number(value)
        if (!Number.isFinite(numeric) || numeric <= 0) return ''
        try {
          return new Date(numeric).toLocaleString(uiLang() === 'en' ? 'en-US' : 'ru-RU', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })
        } catch { return '' }
      }
      const close = () => {
        if (onClose !== undefined) onClose()
        else {
          panel.style.display = 'none'
          const scrim = document.getElementById(SCRIM_ID)
          if (scrim !== null) scrim.style.display = 'none'
        }
      }
      const deviceRows = shown.map((device) => {
        const seen = lastSeen(device.lastSeenAt)
        return `
          <div class="dshm-dsh-device">
            <span class="dshm-dsh-device-dot" aria-hidden="true"></span>
            <div class="dshm-dsh-device-main">
              <div class="dshm-dsh-device-name">${escapeHtml(device.label ?? tr('телефон'))}</div>
              ${seen === '' ? '' : `<div class="dshm-dsh-device-meta">${escapeHtml(seen)}</div>`}
            </div>
            <button type="button" class="dshm-dsh-btn danger" data-revoke="${escapeHtml(device.id)}">${tr('Отключить')}</button>
          </div>`
      }).join('')
      panel.innerHTML = `
        <div class="dshm-dsh-head">
          <div class="dshm-dsh-brand">
            <span class="dshm-dsh-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6.5" y="2.5" width="11" height="19" rx="2.4"></rect><path d="M10 5.2h4"></path><path d="M10.5 19.4h3"></path>
              </svg>
            </span>
            <div>
              <div class="dshm-dsh-title">DDeck</div>
              <div class="dshm-dsh-sub">${tr('Подключение телефона')}</div>
            </div>
          </div>
          <div class="dshm-dsh-head-actions">
            <button type="button" class="dshm-dsh-btn" data-refresh>${tr('Новый код')}</button>
            <button type="button" class="dshm-dsh-close" data-close aria-label="${tr('Закрыть')}">×</button>
          </div>
        </div>
        <div class="dshm-dsh-body">
          <div class="dshm-dsh-pair">
            <div>
              <div class="dshm-dsh-qr">${data.qrSvg ?? ''}</div>
              <div class="dshm-dsh-qr-hint">${tr('Откройте DDeck на телефоне и наведите камеру на код.')}</div>
            </div>
            <div>
              <div class="dshm-dsh-kicker">${tr('Код подключения')}</div>
              <div class="dshm-dsh-code">${escapeHtml(code)}</div>
              <div class="dshm-dsh-expiry">${escapeHtml(expires)}</div>
              <div class="dshm-dsh-url">${escapeHtml(origins)}</div>
              <div class="dshm-dsh-actions">
                <span class="dshm-dsh-status ${gatewayDown ? 'bad' : ''}"><span class="dshm-dsh-dot" aria-hidden="true"></span>${gatewayDown ? tr('Шлюз не запущен') : tr('Шлюз активен')}</span>
              </div>
            </div>
          </div>
          ${gatewayDown ? `<p class="dshm-dsh-warning">${tr('Шлюз не запущен — этот код не сработает. Перезапустите DSH и откройте панель заново.')}</p>` : ''}
          <section>
            <div class="dshm-dsh-section-head">
              <span class="dshm-dsh-section-title">${tr('Подключённые устройства')}</span>
              <span class="dshm-dsh-count">${devices.length}</span>
            </div>
            <div class="dshm-dsh-devices">
              ${devices.length === 0 ? `<p class="dshm-dsh-empty">${tr('Пока ни одного устройства.')}</p>` : deviceRows}
            </div>
            ${rest > 0 ? `<p class="dshm-dsh-rest">${tr('и ещё')} ${rest}</p>` : ''}
          </section>
          <div class="dshm-dsh-links">
            <button type="button" class="dshm-dsh-link" data-help>${tr('Как подключиться?')}</button>
            <button type="button" class="dshm-dsh-link" data-server>${tr('Свой сервер')}</button>
          </div>
          <div class="dshm-dsh-form" data-server-layer style="display:none">
            <div class="dshm-dsh-form-title">${tr('Свой сервер')}</div>
            <p class="dshm-dsh-note">${tr('Введите адрес VPS или SSH-хост из ~/.ssh/config. Публичный адрес и туннель настроятся сами.')}</p>
            <input class="dshm-dsh-input" data-server-address placeholder="relay.example.com или relay-vds">
            <div class="dshm-dsh-form-actions">
              <button type="button" class="dshm-dsh-btn primary" data-server-run>${tr('Настроить сервер')}</button>
              <button type="button" class="dshm-dsh-btn" data-server-close>${tr('Закрыть')}</button>
            </div>
            <div class="dshm-dsh-note" data-server-message></div>
          </div>
          <div class="dshm-dsh-help" data-help-layer style="display:none">
            <div class="dshm-dsh-help-card" role="dialog" aria-label="${tr('Как подключиться?')}">
              <div class="dshm-dsh-help-title">${tr('Как подключиться?')}</div>
              ${HELP_STEPS.map((line) => `<p class="dshm-dsh-note">${escapeHtml(tr(line))}</p>`).join('')}
              <div class="dshm-dsh-divider"></div>
              ${HELP_TROUBLE.map((line) => `<p class="dshm-dsh-note">${escapeHtml(tr(line))}</p>`).join('')}
              <div class="dshm-dsh-form-actions" style="justify-content:flex-end">
                <a href="${HELP_URL}" target="_blank" rel="noreferrer" class="dshm-dsh-link">${tr('Полная инструкция')}</a>
                <button type="button" class="dshm-dsh-btn primary" data-help-close>${tr('Понятно')}</button>
              </div>
            </div>
          </div>
        </div>
      `
      panel.querySelector('[data-close]')?.addEventListener('click', close)
      panel.querySelector('[data-refresh]')?.addEventListener('click', () => loadPanel(panel, onRevoke, true, onClose))
      const helpLayer = panel.querySelector('[data-help-layer]')
      panel.querySelector('[data-help]')?.addEventListener('click', () => { if (helpLayer !== null) helpLayer.style.display = 'flex' })
      panel.querySelector('[data-help-close]')?.addEventListener('click', () => { if (helpLayer !== null) helpLayer.style.display = 'none' })
      helpLayer?.addEventListener('click', (event) => { if (event.target === helpLayer) helpLayer.style.display = 'none' })
      const serverLayer = panel.querySelector('[data-server-layer]')
      panel.querySelector('[data-server]')?.addEventListener('click', () => {
        if (serverLayer !== null) serverLayer.style.display = serverLayer.style.display === 'none' ? 'flex' : 'none'
      })
      panel.querySelector('[data-server-close]')?.addEventListener('click', () => { if (serverLayer !== null) serverLayer.style.display = 'none' })
      panel.querySelector('[data-server-run]')?.addEventListener('click', async () => {
        const address = panel.querySelector('[data-server-address]')?.value?.trim() || ''
        const message = panel.querySelector('[data-server-message]')
        if (message !== null) message.textContent = tr('Настраиваю…')
        try {
          const response = await fetch('/dsh-remote/server', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address }) })
          const data = await response.json().catch(() => ({}))
          if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`)
          if (message !== null) message.textContent = data.output || 'Готово: сервер настроен.'
          loadPanel(panel, onRevoke, true, onClose)
        } catch (error) {
          if (message !== null) message.textContent = `${tr('Ошибка')}: ${String(error instanceof Error ? error.message : error)}`
        }
      })
      for (const button of panel.querySelectorAll('[data-revoke]')) {
        button.addEventListener('click', () => onRevoke(button.getAttribute('data-revoke')))
      }
    }

    /** Загрузить данные и показать панель. */
    function loadPanel(panel, onRevoke, force = false, onClose) {
      fetch('/dsh-remote/pairing', { cache: 'no-store', method: force ? 'POST' : 'GET' })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
        .then((data) => fillPanel(panel, data, onRevoke, onClose))
        .catch((error) => {
          delete panel.dataset.dshmSignature
          injectPanelStyles()
          panel.innerHTML = `
            <div class="dshm-dsh-head">
              <div><div class="dshm-dsh-title">DDeck</div><div class="dshm-dsh-sub">${tr('Подключение телефона')}</div></div>
              <button type="button" class="dshm-dsh-close" data-close aria-label="${tr('Закрыть')}">×</button>
            </div>
            <div class="dshm-dsh-body"><p class="dshm-dsh-warning">${tr('Не удалось получить код (')}${escapeHtml(String(error.message ?? error))}). ${tr('Проверьте журнал DSH.')}</p></div>`
          panel.querySelector('[data-close]')?.addEventListener('click', () => {
            if (onClose !== undefined) onClose()
            else { panel.style.display = 'none'; const scrim = document.getElementById(SCRIM_ID); if (scrim !== null) scrim.style.display = 'none' }
          })
        })
    }

    /** Кнопка в подвале боковой панели. */
    function RemoteLauncher({ wide }) {
      const [open, setOpen] = react.useState(false)
      const panel = react.useRef(null)

      react.useEffect(() => {
        if (!open) {
          if (panel.current !== null) panel.current.style.display = 'none'
          const existing = document.getElementById(SCRIM_ID)
          if (existing !== null) existing.style.display = 'none'
          return undefined
        }
        const element = panelElement()
        panel.current = element
        element.style.display = 'block'
        const scrim = scrimElement(() => setOpen(false))
        scrim.style.display = 'block'
        const closePanel = () => setOpen(false)
        const revoke = (deviceId) => {
          fetch('/dsh-remote/revoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId }) })
            .then(() => loadPanel(element, revoke, false, closePanel))
            .catch(() => {})
        }
        loadPanel(element, revoke, false, closePanel)
        // Код живёт 5 минут и сервер вращает окно сам: открытая панель должна
        // подхватывать новый код, а не показывать просроченный QR.
        const timer = window.setInterval(() => {
          if (!document.hidden) loadPanel(element, revoke, false, closePanel)
        }, 2_000)
        const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
        window.addEventListener('keydown', onKey)
        return () => {
          window.clearInterval(timer)
          window.removeEventListener('keydown', onKey)
        }
      }, [open])

      return h(react.Fragment, null,
        h('button', {
          type: 'button',
          'aria-expanded': open,
          'aria-label': 'DDeck',
          title: 'DDeck',
          onClick: () => setOpen((value) => !value),
          style: {
            display: 'flex', alignItems: 'center', gap: '0.5rem', width: wide ? '100%' : 'auto',
            padding: '0.5rem', borderRadius: '0.5rem', border: 0, background: 'transparent',
            color: 'inherit', cursor: 'pointer', fontSize: 'inherit', textAlign: 'left',
          },
        },
          h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': 'true' },
            h('rect', { x: 3, y: 5, width: 13, height: 11, rx: 2 }),
            h('path', { d: 'M7 10l2 2-2 2M11 14h3' }),
            h('circle', { cx: 19.5, cy: 6, r: 1.5 })),
          wide ? h('span', null, 'DDeck') : null))
    }

    module.exports = {
      name: 'ddeck-remote',
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('settings.general.item', () => ctx.slots.register({
          name: 'settings.general.item',
          id: 'dsh-remote',
          order: 40,
        }, RemoteRow))
        // Подвал боковой панели: привычное место, где живёт «Мобильный доступ» у штатного
        // плагина. Слот отдаёт `wide` — в узкой рейке кнопка остаётся иконкой.
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'dsh-remote',
          order: 10,
        }, RemoteLauncher))
      },
    }
    return module.exports
  },
})
