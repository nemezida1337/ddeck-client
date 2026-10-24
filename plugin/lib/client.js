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

    /**
     * Панель «DDeck».
     *
     * Состояние одно и берётся целиком с сервера: тип устройства, код и адрес приходят
     * вместе, иначе панель могла бы показать код от одного шлюза с адресом другого.
     */
    function RemoteRow() {
      const [state, setState] = react.useState({ status: 'loading' })

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
        return h('div', { style: STYLE.row }, h('div', { style: STYLE.note }, 'Загружаем…'))
      }
      if (state.status === 'error') {
        return h('div', { style: STYLE.row },
          h('div', { style: STYLE.title }, 'DDeck'),
          h('div', { style: STYLE.note }, `Не удалось получить код (${state.message}). Проверьте журнал DSH.`))
      }

      const { data } = state
      const devices = Array.isArray(data.devices) ? data.devices : []
      const expiresLabel = Number(data.expiresAt) > 0
        ? `Код действует до ${new Date(Number(data.expiresAt)).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
        : ''

      const revoke = (deviceId) => {
        fetch('/dsh-remote/revoke', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        }).then(load).catch(() => {})
      }

      return h('div', { style: STYLE.row },
        h('div', { style: STYLE.head },
          h('div', { style: STYLE.title }, devices.length > 0 ? 'Подключить ещё один телефон' : 'Подключить телефон'),
          h('button', { type: 'button', style: STYLE.button, onClick: () => load(true) }, 'Новый код')),
        h('div', { style: STYLE.note }, 'Откройте DDeck на телефоне и наведите камеру на код.'),
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
          ? h('div', { style: STYLE.note }, 'Пока ни одного устройства.')
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.375rem' } },
            h('div', { style: STYLE.note }, `Подключено: ${devices.length}`),
            ...devices.map((device) => h('div', {
              key: device.id,
              style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                padding: '0.375rem 0.5rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem' },
            },
              h('span', { style: { fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, String(device.label ?? 'телефон')),
              h('button', { type: 'button', style: { ...STYLE.button, padding: '0.1875rem 0.5rem', fontSize: '0.75rem' }, onClick: () => revoke(device.id) }, 'Отключить'))),
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
      scrim.setAttribute('aria-label', 'Закрыть')
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
      // Показываем пять самых свежих: за время разработки накопилось больше тридцати
      // сопряжений, и портянка из них превращала панель в свалку.
      const devices = (Array.isArray(data.devices) ? data.devices : [])
        .slice()
        .sort((a, b) => Number(b.lastSeenAt ?? 0) - Number(a.lastSeenAt ?? 0))
      const shown = devices.slice(0, 5)
      const rest = devices.length - shown.length
      const rows = shown.map((device) => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding:0.5rem;border:1px solid var(--dshm-line,rgba(255,255,255,0.14));border-radius:0.5rem;margin-top:0.375rem">
          <span style="font-size:0.8125rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(device.label ?? 'телефон')}</span>
          <button type="button" data-revoke="${escapeHtml(device.id)}" style="min-height:2.25rem;padding:0.25rem 0.5rem;border-radius:0.5rem;border:1px solid var(--dshm-line,rgba(255,255,255,0.14));background:transparent;color:#e0a3a3;font:inherit;font-size:0.75rem;cursor:pointer">Отключить</button>
        </div>`).join('')
      const restLine = rest > 0
        ? `<div style="margin-top:.5rem;font-size:.75rem;opacity:.65">и ещё ${rest}</div>`
        : ''
      panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem">
          <strong>Подключить телефон</strong>
          <button type="button" data-refresh style="min-height:2.25rem;padding:0.25rem 0.75rem;border-radius:0.5rem;border:1px solid var(--dshm-line,rgba(255,255,255,0.14));background:transparent;color:inherit;font:inherit;font-size:0.8125rem;cursor:pointer">Новый код</button>
        </div>
        <p style="margin:0.5rem 0 0.75rem;opacity:0.75;font-size:0.875rem">Откройте DDeck на телефоне и наведите камеру на код.</p>
        <p style="margin:0 0 0.75rem;opacity:0.6;font-size:0.75rem">${Number(data.expiresAt) > 0 ? `Код действует до ${new Date(Number(data.expiresAt)).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
        <div style="background:#fff;padding:0.5rem;border-radius:0.75rem;line-height:0;width:10rem;height:10rem">${data.qrSvg ?? ''}</div>
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:1.5rem;letter-spacing:0.28em;margin-top:0.75rem">${escapeHtml(data.code ?? '')}</div>
        <div style="font-size:0.8125rem;word-break:break-all;margin-top:0.375rem">${escapeHtml((Array.isArray(data.origins) && data.origins.length > 0 ? data.origins : [data.origin]).filter(Boolean).join(" · "))}</div>
        <details style="margin-top:0.75rem;font-size:0.8125rem">
          <summary style="cursor:pointer;opacity:0.8">Дополнительно</summary>
          <div style="display:flex;flex-direction:column;gap:0.375rem;margin-top:0.5rem;opacity:0.85">
            <a href="/dsh-remote" target="_blank" rel="noreferrer" style="color:inherit">Открыть страницу подключения</a>
            <span style="word-break:break-all;opacity:0.7">${escapeHtml((Array.isArray(data.origins) && data.origins.length > 0 ? data.origins : [data.origin]).filter(Boolean).join(" · "))}</span>
          </div>
        </details>
        ${devices.length === 0 ? '<p style="opacity:0.75;font-size:0.8125rem;margin:0.75rem 0 0">Пока ни одного устройства.</p>' : `<p style="opacity:0.75;font-size:0.8125rem;margin:0.75rem 0 0">Подключено: ${devices.length}</p>${rows}${restLine}`}
      `
      panel.querySelector('[data-refresh]')?.addEventListener('click', () => loadPanel(panel, onRevoke, true))
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
          panel.innerHTML = `<strong>DDeck</strong><p style="opacity:0.75;font-size:0.875rem">Не удалось получить код (${String(error.message ?? error)}).</p>`
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
