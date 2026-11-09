  /* ── 10c. КОМПАКТНАЯ НИЖНЯЯ НАВИГАЦИЯ ───────────────────────────────────
   * Настольные строки «Плагины», «Автоматические задачи» и «Ещё» занимают
   * верх панели, хотя на телефоне нужнее рабочие области. Переносим их в одну
   * иконную строку внизу; «Подключить телефон» и «Плагины» прячем в «Ещё».
   */

  let sidebarMoreOpen = false

  /** SVG иконки нижней навигации: только чёрно-белые, без подписей. */
  const BOTTOM_ICONS = {
    account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.8 20c.5-3.3 3.2-5.3 7.2-5.3s6.7 2 7.2 5.3"/></svg>',
    automations: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.2"/><path d="M12 7.5V12l3 2"/><path d="M7 4.5 5 2.7M17 4.5l2-1.8"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.5" cy="12" r="1.7"/></svg>',
    phoneN: '<span class="dshm-phone-n"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.4"/><path d="M10 5.2h4"/><path d="M10.5 19.4h3"/></svg><b>N</b></span>',
    computer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    plugins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  }

  /** Убедиться, что нативная боковая панель клиента открыта, а не только наш CSS-ящик. */
  function ensureNativeSidebarPanel() {
    // Clicking the native opener is a TOGGLE: don't close an already open
    // drawer just because a bottom-bar action wants to click a row inside it.
    const dialog = document.querySelector('[role=dialog][data-shortcut-modal="sidebar"]')
    if (dialog !== null && visible(dialog) && rect(dialog).x >= 0) return
    const toggle = findButton(/Открыть боковую панель|Open sidebar|打开侧边栏/iu)
    if (toggle === undefined) return
    suppressCloseUntil = Date.now() + 500
    toggle.click()
  }

  /** Click a native sidebar row, opening the drawer first only when needed. */
  function activateNativeSidebarRow(label) {
    const direct = [...document.querySelectorAll(
      '[role=dialog][data-shortcut-modal="sidebar"] button, [class*="_sidebarCol"] button',
    )].find((button) =>
      visible(button)
      && button.closest('.dshm-bottom-nav, .dshm-more-menu, .dshm-menu') === null
      && label.test((button.getAttribute('aria-label') || button.innerText || '').trim()))
    if (direct !== undefined) {
      direct.click()
      return
    }
    const existing = nativeSidebarButton(label)
    if (existing !== undefined) {
      existing.click()
      return
    }
    ensureNativeSidebarPanel()
    window.setTimeout(() => nativeSidebarButton(label, true)?.click(), 80)
  }

  /** Найти скрытую нативную кнопку по подписи.
   *
   * Только внутри native sidebar и никогда среди наших собственных кнопок.
   * Иначе кнопка «Автоматические задачи» в нашем нижнем баре находила саму
   * себя и зацикливала открытие меню (DSH 0.2.2).
   */
  function nativeSidebarButton(label, includeHidden = false) {
    const roots = [...document.querySelectorAll(
      '[role=dialog][data-shortcut-modal="sidebar"], [class*="_sidebarCol"]',
    )]
    const scope = roots.length > 0 ? roots : [document]
    for (const root of scope) {
      const button = [...root.querySelectorAll('button')].find((candidate) =>
        (includeHidden || visible(candidate))
        && candidate.closest('.dshm-bottom-nav, .dshm-bottom-button, .dshm-more-menu, .dshm-menu, .dshm-account-scrim') === null
        && label.test((candidate.getAttribute('aria-label') || candidate.innerText || '').trim()))
      if (button !== undefined) return button
    }
    return undefined
  }

  /** Открыть меню «Ещё» над нижней строкой. */
  function openSidebarMore() {
    if (sidebarMoreOpen) return
    sidebarMoreOpen = true
    const scrim = document.createElement('button')
    scrim.type = 'button'
    scrim.className = 'dshm-more-scrim'
    scrim.setAttribute('aria-label', tr('Закрыть'))
    const menu = document.createElement('div')
    menu.className = 'dshm-more-menu'
    menu.setAttribute('role', 'menu')
    const close = () => {
      sidebarMoreOpen = false
      scrim.remove()
      menu.remove()
    }
    scrim.addEventListener('click', close)
    const item = (label, icon, action) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'dshm-more-item'
      button.setAttribute('role', 'menuitem')
      button.innerHTML = `${icon}<span>${label}</span>`
      button.addEventListener('click', () => {
        close()
        action()
      })
      menu.appendChild(button)
    }
    // The 0.2.2 sidebar moves «Плагины» into an overflow row; its button is
    // display:none but clicking it still navigates. Search globally: the row
    // can live outside the currently rendered drawer subtree.
    const plugins = [...document.querySelectorAll('button')].find((button) =>
      button.closest('.dshm-bottom-nav, .dshm-more-menu, .dshm-menu') === null
      && /^(Плагины|Plugins|插件)$/u.test((button.getAttribute('aria-label') || button.innerText || '').trim()))
    if (plugins !== undefined) {
      item(tr('Плагины'), BOTTOM_ICONS.plugins, () => {
        activateNativeSidebarRow(/^(Плагины|Plugins|插件)$/iu)
      })
    }
    item(tr('Подключить телефон'), BOTTOM_ICONS.phoneN, openMobilePair)
    item(tr('Сменить компьютер'), BOTTOM_ICONS.computer, () => {
      invokeBridge('connect.open', 'connect.open', {}, true)
    })
    document.body.append(scrim, menu)
  }

  /** Убрать прозрачный перехватчик закрытия меню аккаунта. */
  function removeAccountScrim() {
    accountScrim?.remove()
    accountScrim = null
    setAccountButtonActive(false)
  }

  /** Прозрачный слой над нижней строкой: второе касание закрывает меню. */
  function ensureAccountScrim() {
    if (accountScrim !== null) return
    accountScrim = document.createElement('button')
    accountScrim.type = 'button'
    accountScrim.className = 'dshm-account-scrim'
    accountScrim.setAttribute('aria-label', tr('Закрыть'))
    accountScrim.addEventListener('click', () => {
      const menu = document.querySelector('[data-dshm-account-menu]')
      if (menu !== null) {
        menu.setAttribute('data-dshm-account-closed', '')
        menu.style.setProperty('display', 'none', 'important')
      }
      removeAccountScrim()
    })
    document.body.appendChild(accountScrim)
  }

  /** Число повторов открытия меню аккаунта во время анимации drawer. */
  let accountOpenRetries = 0

  /** Открыть нативное меню аккаунта и прижать его над нижней строкой. */
  /**
   * Open DSH Settings through the account launcher's React callback.
   *
   * In 0.2.2 the account menu is portalled outside the native drawer; opening it
   * closes the drawer and unmounts both, leaving no Settings entry on mobile.
   * The AccountMenu component still receives `openSettings`; walk the React fiber
   * from the native trigger to that callback. Guarded by try/catch so a future
   * DSH cannot break the button: the legacy account menu remains the fallback.
   *
   * @returns {boolean} whether Settings was opened.
   */
  function openSettingsViaAccountLauncher() {
    try {
      const trigger = [...document.querySelectorAll('button')]
        .find((button) => /^(Меню аккаунта|Меню учётной записи|Account menu|账户菜单)$/u.test((button.getAttribute('aria-label') || '').trim()))
      if (trigger === undefined) return false
      const fiberKey = Object.keys(trigger).find((key) => key.startsWith('__reactFiber$'))
      if (fiberKey === undefined) return false
      for (let fiber = trigger[fiberKey], depth = 0; fiber !== null && fiber !== undefined && depth < 20; fiber = fiber.return, depth += 1) {
        const props = fiber.memoizedProps
        if (props !== null && typeof props === 'object' && typeof props.openSettings === 'function') {
          closeDrawerLight()
          props.openSettings()
          return true
        }
      }
    } catch (error) {
      window.__dshmSettingsError = String(error && error.message || error)
    }
    return false
  }

  function openAccountMenu() {
    if (openSettingsViaAccountLauncher()) return
    const bridge = window.__DSH_MOBILE_NATIVE__
    if (bridge !== undefined && typeof bridge.capabilities === 'function') {
      bridge.capabilities().then((capabilities) => {
        if (!Array.isArray(capabilities) || !capabilities.includes('settings.open')) return openAccountMenuLegacy()
        closeDrawerLight()
        return bridge.invoke('settings.open', {})
      }).catch(() => openAccountMenuLegacy())
      return
    }
    openAccountMenuLegacy()
  }

  function openAccountMenuLegacy() {
    if (document.documentElement.hasAttribute('data-dshm-account-opening')) return
    const source = nativeSidebarButton(/Меню аккаунта|Меню учётной записи|Account menu|账户菜单/iu, true)
    if (source === undefined) return
    if (!nativeSidebarOpen()) {
      // The account button only exists inside the open drawer. If the tap lands
      // during its opening animation, retry without toggling the opener: calling
      // setNativeSidebar(true) here closed the drawer in 0.10.2.
      if (accountOpenRetries < 3) {
        accountOpenRetries += 1
        window.setTimeout(() => openAccountMenu(), 220)
      }
      return
    }
    accountOpenRetries = 0
    const hidden = document.querySelector('[data-dshm-account-closed]')
    if (hidden !== null) {
      hidden.removeAttribute('data-dshm-account-closed')
      hidden.style.removeProperty('display')
      setAccountButtonActive(true)
      ensureAccountScrim()
      return
    }
    const opened = [...document.querySelectorAll('[role=menu]')]
      .find((element) => /Настройки|Отзыв|Выйти|Settings|Feedback|Log out|Logout/u.test(element.textContent || ''))
    if (opened !== undefined && opened.getBoundingClientRect().height > 0) {
      // Тот же нативный триггер закрывает меню повторным нажатием.
      source.click()
      setAccountButtonActive(false)
      removeAccountScrim()
      return
    }
    document.documentElement.setAttribute('data-dshm-account-opening', '')
    setAccountButtonActive(true)
    source.click()
    // Меню позиционируется относительно скрытой родной кнопки аккаунта и
    // оказывается в левом верхнем углу. После открытия переносим его над
    // нашей нижней строкой.
    const place = () => {
      const menu = [...document.querySelectorAll('[role=menu]')]
        .find((element) => /Настройки|Отзыв|Выйти|Settings|Feedback|Log out|Logout/u.test(element.textContent || element.innerText || ''))
      if (menu === undefined) return false
      menu.dataset.dshmAccountMenu = ''
      menu.style.setProperty('top', 'auto', 'important')
      menu.style.setProperty('left', '.5rem', 'important')
      menu.style.setProperty('bottom', 'calc(env(safe-area-inset-bottom) + 3.75rem)', 'important')
      menu.style.setProperty('max-height', 'calc(100dvh - 5rem)', 'important')
      document.documentElement.removeAttribute('data-dshm-account-opening')
      setAccountButtonActive(true)
      ensureAccountScrim()
      return true
    }
    // Нативный портал может смонтироваться позже таймеров (особенно после
    // первого запуска). Ждём его появления наблюдателем и коротким опросом.
    let placed = false
    const finish = () => {
      document.documentElement.removeAttribute('data-dshm-account-opening')
      observer.disconnect()
      window.clearInterval(poll)
    }
    const tryPlace = () => {
      if (placed) return
      if (place()) {
        placed = true
        finish()
      }
    }
    const observer = new MutationObserver(tryPlace)
    observer.observe(document.body, { childList: true, subtree: true })
    const poll = window.setInterval(tryPlace, 50)
    tryPlace()
    window.setTimeout(() => {
      if (!placed) finish()
    }, 2000)
  }

  /**
   * Адресованный субагент — история выполнения, а не полноценный чат.
   * Клиент сам показывает read-only composer; делаем его заметной плашкой и
   * убираем из этой области плюс/док/микрофон, чтобы не было ложных действий.
   */
  function syncSubagentReadOnly() {
    const lineage = document.querySelector('[data-slot="conversation.session.header.lineage"]')
    const switcher = lineage?.querySelector('button[aria-label*="субагент"], button[aria-label*="subagent"], button[aria-label*="Switch subagent"]') ?? null
    const frame = [...document.querySelectorAll('[role=status]')]
      .find((element) => {
        const rect = element.getBoundingClientRect()
        if (rect.width < 80 || rect.height < 20) return false
        return /read.?only|readonly|只读|только.*чтени|one-shot subagent record/iu.test(element.innerText || '')
      })
    const composer = document.querySelector(':is([class$="_composerStack"], [class*="_composerStack "])')
    const editable = composer?.querySelector('[contenteditable="true"], textarea, input:not([type="hidden"])')
    const inComposer = frame?.closest(':is([class$="_composerStack"], [class*="_composerStack "])') !== null && frame !== undefined
    const readOnly = switcher !== null || (frame !== undefined && (inComposer || editable === undefined || editable === null))
    setAttrIfChanged(document.documentElement, 'data-dshm-subagent-readonly', readOnly ? '' : null)
    // Не даём печатать в карточку субагента и на телефоне: на десктопе это
    // история выполнения. Атрибут снимается при возврате в обычную сессию.
    for (const input of document.querySelectorAll('[data-dshm-readonly-editor]')) {
      if (readOnly) continue
      input.setAttribute('contenteditable', 'true')
      input.removeAttribute('data-dshm-readonly-editor')
    }
    if (readOnly) {
      for (const input of composer?.querySelectorAll('[contenteditable="true"]') ?? []) {
        input.setAttribute('contenteditable', 'false')
        input.setAttribute('data-dshm-readonly-editor', '')
      }
    }
    let banner = document.querySelector('.dshm-readonly-banner')
    if (!readOnly) {
      banner?.remove()
      return
    }
    if (banner === null) {
      banner = document.createElement('div')
      banner.className = 'dshm-readonly-banner'
      banner.setAttribute('role', 'status')
      if (frame !== undefined && frame.parentElement !== null) frame.parentElement.insertBefore(banner, frame)
      else if (composer?.parentElement !== null && composer?.parentElement !== undefined) composer.parentElement.insertBefore(banner, composer)
      else document.body.appendChild(banner)
    }
    banner.innerHTML = `<strong>${tr('Просмотр субагента')}</strong><span>${tr('Отправка сообщений недоступна — это история выполнения.')}</span>`
    if (frame !== undefined) frame.setAttribute('data-dshm-readonly-frame', '')
  }

  /** Быстро синхронизировать видимость нижней строки при поиске/диалогах. */
  function syncOverlayVisibility() {
    syncSubagentReadOnly()
    if (accountScrim !== null && document.querySelector('[data-dshm-account-menu]') === null) removeAccountScrim()
    // Верхняя маска вторичной страницы не должна оставаться на чате после
    // возврата: клиент мог уйти со страницы без события scroll. Считаем
    // состояние каждый тик по видимой прокрученной странице.
    const secondaryScrolled = onSecondaryScreen()
      && [...document.querySelectorAll('[class*="_page"], [class*="_scrollBody"], [class*="_options"], [class*="_body"]')]
        .some((page) => page.scrollTop > 4 && page.getBoundingClientRect().width > 0
          && getComputedStyle(page).display !== 'none')
    setAttrIfChanged(document.documentElement, 'data-dshm-page-scrolled', secondaryScrolled ? '' : null)
    // Настройки/другие полноэкранные диалоги клиента не должны держать над собой
  // нашу нижнюю строку иконок от боковой панели.
  // DSH 0.2.2 adds role="dialog" to the closed sidebar drawer; it is off-screen
  // but still in the DOM. Counting it as a modal hid our bottom nav and the
  // floating menu button on every screen. Only an on-screen client dialog counts.
  // DSH 0.2.2's native drawer owns .sidebarCol geometry. Disable the legacy
  // CSS drawer rules on this version; on 0.2.1 the marker stays absent.
  const nativeSidebar = document.querySelector('[role=dialog][data-shortcut-modal="sidebar"]')
  setAttrIfChanged(document.documentElement, 'data-dshm-native-sidebar', nativeSidebar !== null ? '' : null)
  // Native DSH drawer has no data-dshm-drawer. Mirror its open state for the
  // tests and for our own menu/back logic, without applying the old CSS drawer.
  const nativeDrawer = document.querySelector('[role=dialog][data-shortcut-modal="sidebar"]')
  if (nativeDrawer !== null) {
    const nativeOpen = visible(nativeDrawer) && rect(nativeDrawer).x >= 0
    if (nativeOpen !== drawerOpen) {
      drawerOpen = nativeOpen
      document.documentElement.toggleAttribute('data-dshm-drawer', nativeOpen)
    }
  }
  const modal = [...document.querySelectorAll('[role=dialog], [data-shortcut-modal="settings"]')].some((element) =>
    onScreen(element)
      // DSH 0.2.2 renders the navigation drawer as role=dialog too. It is a
      // client surface, not a blocking modal: the drawer has its own bottom
      // nav and the floating menu is hidden by data-dshm-drawer.
      && element.getAttribute('data-shortcut-modal') !== 'sidebar'
      && element.querySelector(':is([class$="_sidebarCol"], [class*="_sidebarCol "])') === null)
  setAttrIfChanged(document.documentElement, 'data-dshm-modal', modal ? '' : null)
  const searchInput = document.querySelector('input[placeholder^="Поиск"]')
  const searchOpen = searchInput !== null
    && searchInput.getBoundingClientRect().width > 100
    && searchInput.getBoundingClientRect().x >= 0
  setAttrIfChanged(document.documentElement, 'data-dshm-search-open', searchOpen ? '' : null)
  // Поповеры (настройки рабочих областей, аккаунт) не должны пересекаться с
  // нижней строкой иконок; она нужна только на самой панели.
  }

  // Scroll events do not bubble, but a capture listener catches every scrollable
  // secondary page. This makes the top scrim appear immediately after the first
  // wheel/touch scroll, not only on the next 800 ms tick.
  document.addEventListener('scroll', () => {
    if (paused() || !onSecondaryScreen()) return
    const scrolled = [...document.querySelectorAll('[class*="_page"], [class*="_scrollBody"], [class*="_options"], [class*="_body"]')]
      .some((page) => page.scrollTop > 4 && page.getBoundingClientRect().width > 0
        && getComputedStyle(page).display !== 'none')
    setAttrIfChanged(document.documentElement, 'data-dshm-page-scrolled', scrolled ? '' : null)
  }, true)

  /** Одна строка иконок внизу боковой панели. */
  function ensureBottomSidebarNav() {
    const column = document.querySelector(':is([class$="_sidebarCol"], [class*="_sidebarCol "])')
    if (column === null) return
    // Верхние настольные строки больше не нужны — рабочие области поднимаются
    // сразу под «Новая сессия».
    for (const row of column.querySelectorAll(':is([class$="_panelRow"], [class*="_panelRow "])')) {
      const label = (row.getAttribute('aria-label') || row.innerText || '').trim()
      if (!/^(Плагины|Автоматические задачи|Ещё|Plugins|Automations|More|插件|自动化|更多)$/iu.test(label)) continue
      row.setAttribute('data-dshm-top-hidden', '')
      row.style.display = 'none'
    }
    for (const element of column.querySelectorAll('[class*="_footerActions"], [data-dshm-collapse]')) {
      element.setAttribute('data-dshm-footer-hidden', '')
    }
    // Родная строка аккаунта лежит не в footerActions, а в отдельном triggerRow.
    // Скрываем её, оставляя саму кнопку в DOM: нижняя иконка вызывает её click().
    for (const row of column.querySelectorAll('[class*="_triggerRow"]')) {
      if (row.querySelector('button[aria-label*="Меню аккаунта"], button[aria-label*="Меню учётной записи"], button[aria-label*="Account menu"]') === null) continue
      row.setAttribute('data-dshm-footer-hidden', '')
      row.style.display = 'none'
    }
    let nav = column.querySelector('.dshm-bottom-nav')
    if (nav === null) {
      nav = document.createElement('div')
      nav.className = 'dshm-bottom-nav'
      const make = (label, icon, onclick, shortLabel = label) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'dshm-bottom-button'
        button.setAttribute('aria-label', shortLabel)
        button.setAttribute('data-dshm-full-label', label)
        button.setAttribute('data-dshm-short-label', shortLabel)
        button.title = label
        button.innerHTML = `${icon}<span class="dshm-bottom-label">${shortLabel}</span>`
        button.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          tapHaptic()
          onclick()
        })
        nav.appendChild(button)
        return button
      }
      accountButton = make(tr('Вы вошли в DeepSeek'), BOTTOM_ICONS.account, openAccountMenu, tr('Аккаунт'))
      make(tr('Автоматические задачи'), BOTTOM_ICONS.automations, () => {
        activateNativeSidebarRow(/^(Автоматические задачи|Задачи автоматизации|Automations|自动化)$/iu)
      }, tr('Задачи'))
      make(tr('Ещё'), BOTTOM_ICONS.more, openSidebarMore, tr('Ещё'))
      column.appendChild(nav)
    }
  }

