
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
  'Введите адрес VPS или SSH-хост из ~/.ssh/config. Публичный адрес и туннель настроятся сами.': 'Enter a VPS address or an SSH host from ~/.ssh/config. The public address and tunnel will be configured automatically.',
  'Сейчас:': 'Current:',
  'туннель активен': 'tunnel active',
  'Настроить сервер': 'Set up server',
  'Настраиваю…': 'Setting up…',
  'Ошибка': 'Error',
  'Настраиваю…': 'Setting up…',
  'Полная инструкция': 'Full guide',
  'Понятно': 'Got it',
  '1. На компьютере откройте DSH → панель «DDeck».': '1. On the computer open DSH → the “DDeck” panel.',
  '2. Включите Tailscale или поднимите свой сервер (docs/RELAY).': '2. Turn on Tailscale or set up your own server (docs/RELAY).',
  '3. Нажмите «Новый код» и отсканируйте QR телефоном.': '3. Tap “New code” and scan the QR with the phone.',
  'Код живёт 5 минут. Старый QR не подойдёт — возьмите свежий.': 'The code lives for five minutes. An old QR will not work — get a fresh one.',
  'Ошибка про отпечаток: «Забыть» старый компьютер и сопрягите заново.': 'Fingerprint error: forget the old computer and pair again.',
  'Timeout: проверьте, что Mac не спит, DSH запущен, Tailscale/сервер доступен.': 'Timeout: check the Mac is awake, DSH is running and Tailscale/your server is reachable.',
  'Шлюз не запущен — этот код не сработает. Перезапустите DSH и откройте панель заново.': 'The gateway is not running — this code will not work. Restart DSH and reopen the panel.',
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
  id: 'dsh-remote',
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
        return h('div', { style: STYLE.row }, h('div', { style: STYLE.note }, tr('Загружаем…')))
      }
      if (state.status === 'error') {
        return h('div', { style: STYLE.row },
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

      return h('div', { style: STYLE.row },
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
          h('button', { type: 'button', style: STYLE.button, onClick: () => setServerOpen((open) => !open) }, tr('Свой сервер'))),
        serverOpen ? h(ServerForm, { onDone: () => { setServerOpen(false); load(true) } }) : null,
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
      scrim.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:1190', 'border:0', 'padding:0',
        'background:var(--dshm-scrim,rgba(0,0,0,0.45))', 'display:none',
      ].join(';')
      scrim.addEventListener('click', onClose)
      document.body.appendChild(scrim)
      return scrim
    }

    /** Панель: создаётся один раз, дальше только обновляется содержимое. */
    function panelElement() {
      let panel = document.getElementById(PANEL_ID)
      if (panel !== null) return panel
      panel = document.createElement('div')
      panel.id = PANEL_ID
      panel.setAttribute('role', 'dialog')
      panel.setAttribute('aria-label', 'DDeck')
      panel.style.cssText = [
        'position:fixed', 'z-index:1200', 'left:0.75rem', 'right:0.75rem', 'bottom:calc(env(safe-area-inset-bottom,0px) + 4.5rem)',
        'max-width:22rem', 'margin-left:auto', 'margin-right:auto',
        'box-sizing:border-box', 'max-height:70vh', 'overflow:auto',
        'padding:1rem', 'border-radius:0.875rem',
        'border:1px solid var(--dshm-line,rgba(255,255,255,0.14))',
        'background:var(--dshm-surface,#12151c)', 'color:var(--dshm-ink,#fff)',
        'box-shadow:0 12px 40px rgba(0,0,0,0.45)', 'display:none',
        'font:inherit',
      ].join(';')
      document.body.appendChild(panel)
      return panel
    }

    /** Перерисовать панель по данным плагина. */
    function fillPanel(panel, data, onRevoke) {
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
      const gatewayDown = data.gateway === false
      // Показываем пять самых свежих: за время разработки накопилось больше тридцати
      // сопряжений, и портянка из них превращала панель в свалку.
      const devices = (Array.isArray(data.devices) ? data.devices : [])
        .slice()
        .sort((a, b) => Number(b.lastSeenAt ?? 0) - Number(a.lastSeenAt ?? 0))
      const shown = devices.slice(0, 5)
      const rest = devices.length - shown.length
      const rows = shown.map((device) => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding:0.5rem;border:1px solid var(--dshm-line,rgba(255,255,255,0.14));border-radius:0.5rem;margin-top:0.375rem">
          <span style="font-size:0.8125rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(device.label ?? tr('телефон'))}</span>
          <button type="button" data-revoke="${escapeHtml(device.id)}" style="min-height:2.25rem;padding:0.25rem 0.5rem;border-radius:0.5rem;border:1px solid var(--dshm-line,rgba(255,255,255,0.14));background:transparent;color:#e0a3a3;font:inherit;font-size:0.75rem;cursor:pointer">${tr('Отключить')}</button>
        </div>`).join('')
      const restLine = rest > 0
        ? `<div style="margin-top:.5rem;font-size:.75rem;opacity:.65">и ещё ${rest}</div>`
        : ''
      panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem">
          <strong>${tr('Подключить телефон')}</strong>
          <button type="button" data-refresh style="min-height:2.25rem;padding:0.25rem 0.75rem;border-radius:0.5rem;border:1px solid var(--dshm-line,rgba(255,255,255,0.14));background:transparent;color:inherit;font:inherit;font-size:0.8125rem;cursor:pointer">${tr('Новый код')}</button>
        </div>
        ${gatewayDown ? `<p style="margin:0.5rem 0 0.75rem;padding:0.5rem 0.625rem;border:1px solid #7a4a4a;border-radius:0.5rem;color:#e0a3a3;font-size:0.8125rem">${tr('Шлюз не запущен — этот код не сработает. Перезапустите DSH и откройте панель заново.')}</p>` : ''}
        <p style="margin:0.5rem 0 0.75rem;opacity:0.75;font-size:0.875rem">${tr('Откройте DDeck на телефоне и наведите камеру на код.')}</p>
        <p style="margin:0 0 0.75rem;font-size:0.8125rem">
          <button type="button" data-help style="background:transparent;border:0;color:inherit;text-decoration:underline;cursor:pointer;padding:0;font:inherit">${tr('Как подключиться?')}</button>
          · <button type="button" data-server style="background:transparent;border:0;color:inherit;text-decoration:underline;cursor:pointer;padding:0;font:inherit">${tr('Свой сервер')}</button>
        </p>
        <div data-server-layer style="display:none;border:1px solid #2b2d34;border-radius:0.75rem;padding:0.75rem;margin:0 0 0.75rem">
          <div style="font-size:0.8125rem;opacity:0.72;margin-bottom:0.5rem">${tr('Введите адрес VPS или SSH-хост из ~/.ssh/config. Публичный адрес и туннель настроятся сами.')}</div>
          <input data-server-address placeholder="relay.example.com или relay-vds" style="width:100%;box-sizing:border-box;margin:0 0 0.5rem;padding:0.45rem;border-radius:0.5rem;border:1px solid #2b2d34;background:#12151C;color:#f5f6f8;font:inherit">
          <div style="display:flex;gap:0.5rem">
            <button type="button" data-server-run style="background:#6B8AFD;border:1px solid #6B8AFD;color:#fff;border-radius:0.5rem;padding:0.3rem 0.6rem;cursor:pointer">${tr('Настроить сервер')}</button>
            <button type="button" data-server-close style="background:transparent;border:1px solid currentColor;color:inherit;border-radius:0.5rem;padding:0.3rem 0.6rem;cursor:pointer">${tr('Закрыть')}</button>
          </div>
          <div data-server-message style="font-size:0.75rem;opacity:0.72;white-space:pre-wrap;max-height:9rem;overflow:auto;margin-top:0.5rem"></div>
        </div>
        <div data-help-layer style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.62);align-items:center;justify-content:center;padding:1rem">
          <div role="dialog" aria-label="${tr('Как подключиться?')}" style="max-width:26rem;background:#1b1b1c;color:#f5f6f8;border:1px solid #2b2d34;border-radius:1rem;padding:1rem 1.125rem">
            <strong>${tr('Как подключиться?')}</strong>
            ${HELP_STEPS.map((line) => `<p style="margin:0.5rem 0 0;opacity:0.8;font-size:0.875rem">${escapeHtml(tr(line))}</p>`).join('')}
            <hr style="border:0;border-top:1px solid #2b2d34;margin:0.75rem 0">
            ${HELP_TROUBLE.map((line) => `<p style="margin:0.4rem 0 0;opacity:0.7;font-size:0.8125rem">${escapeHtml(tr(line))}</p>`).join('')}
            <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.75rem">
              <a href="${HELP_URL}" target="_blank" rel="noreferrer" style="color:inherit;font-size:0.8125rem">${tr('Полная инструкция')}</a>
              <button type="button" data-help-close style="background:#6B8AFD;border:1px solid #6B8AFD;color:#fff;border-radius:0.5rem;padding:0.25rem 0.625rem;cursor:pointer">${tr('Понятно')}</button>
            </div>
          </div>
        </div>
        <p style="margin:0 0 0.75rem;opacity:0.6;font-size:0.75rem">${Number(data.expiresAt) > 0 ? `${tr('Код действует до')} ${new Date(Number(data.expiresAt)).toLocaleTimeString(uiLang() === 'en' ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
        <div style="background:#fff;padding:0.5rem;border-radius:0.75rem;line-height:0;width:10rem;height:10rem">${data.qrSvg ?? ''}</div>
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:1.5rem;letter-spacing:0.28em;margin-top:0.75rem">${escapeHtml(data.code ?? '')}</div>
        <div style="font-size:0.8125rem;word-break:break-all;margin-top:0.375rem">${escapeHtml((Array.isArray(data.origins) && data.origins.length > 0 ? data.origins : [data.origin]).filter(Boolean).join(" · "))}</div>
        ${devices.length === 0 ? `<p style="opacity:0.75;font-size:0.8125rem;margin:0.75rem 0 0">${tr('Пока ни одного устройства.')}</p>` : `<p style="opacity:0.75;font-size:0.8125rem;margin:0.75rem 0 0">${tr('Подключено:')} ${devices.length}</p>${rows}${restLine}`}
      `
      panel.querySelector('[data-refresh]')?.addEventListener('click', () => loadPanel(panel, onRevoke, true))
      const helpLayer = panel.querySelector('[data-help-layer]')
      panel.querySelector('[data-help]')?.addEventListener('click', () => { if (helpLayer !== null) helpLayer.style.display = 'flex' })
      panel.querySelector('[data-help-close]')?.addEventListener('click', () => { if (helpLayer !== null) helpLayer.style.display = 'none' })
      helpLayer?.addEventListener('click', (event) => { if (event.target === helpLayer) helpLayer.style.display = 'none' })
      const serverLayer = panel.querySelector('[data-server-layer]')
      panel.querySelector('[data-server]')?.addEventListener('click', () => { if (serverLayer !== null) serverLayer.style.display = serverLayer.style.display === 'none' ? 'block' : 'none' })
      panel.querySelector('[data-server-close]')?.addEventListener('click', () => { if (serverLayer !== null) serverLayer.style.display = 'none' })
      panel.querySelector('[data-server-run]')?.addEventListener('click', async () => {
        const address = panel.querySelector('[data-server-address]')?.value?.trim() || ''
        const message = panel.querySelector('[data-server-message]')
        if (message !== null) message.textContent = tr('Настраиваю…')
        try {
          const response = await fetch('${ROUTE_PREFIX}/server', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address }) })
          const data = await response.json().catch(() => ({}))
          if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`)
          if (message !== null) message.textContent = data.output || 'Готово: сервер настроен.'
          loadPanel(panel, onRevoke, true)
        } catch (error) {
          if (message !== null) message.textContent = `${tr('Ошибка')}: ${String(error instanceof Error ? error.message : error)}`
        }
      })
      for (const button of panel.querySelectorAll('[data-revoke]')) {
        button.addEventListener('click', () => onRevoke(button.getAttribute('data-revoke')))
      }
    }

    /** Загрузить данные и показать панель. */
    function loadPanel(panel, onRevoke, force = false) {
      fetch('/dsh-remote/pairing', { cache: 'no-store', method: force ? 'POST' : 'GET' })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
        .then((data) => fillPanel(panel, data, onRevoke))
        .catch((error) => {
          delete panel.dataset.dshmSignature
          panel.innerHTML = `<strong>DDeck</strong><p style="opacity:0.75;font-size:0.875rem">${tr('Не удалось получить код (')}${String(error.message ?? error)}).</p>`
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
        const revoke = (deviceId) => {
          fetch('/dsh-remote/revoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId }) })
            .then(() => loadPanel(element, revoke))
            .catch(() => {})
        }
        loadPanel(element, revoke)
        // Код живёт 5 минут и сервер вращает окно сам: открытая панель должна
        // подхватывать новый код, а не показывать просроченный QR.
        const timer = window.setInterval(() => {
          if (!document.hidden) loadPanel(element, revoke)
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
      name: 'dsh-remote',
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
