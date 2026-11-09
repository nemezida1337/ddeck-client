  /* ── 6. НАБЛЮДЕНИЕ ЗА СТРАНИЦЕЙ: СТАТИСТИКА ХОДА ───────────────────────
   * Один тикер вместо пяти: каждый проход делает срочное, а редкое — по
   * счётчику. Частый полный обход DOM на длинной переписке давал кадры по
   * 58–117 мс, поэтому строку статистики ищем в доке композера, а не по всей
   * странице.
   */

  /**
   * Держать страницу в порядке.
   *
   * Клиент при запуске может помнить раскрытую панель, и тогда она накрывает экран
   * телефона при каждом открытии. Один раз при старте приводим её в закрытое состояние —
   * дальше состоянием управляем мы.
   */
  function watch() {
    trackRightPanel()
    bindSessionRowTap()
    bindSettingsTabsScroll()
    let closedOnce = false
    const tick = () => {
      // Панель могла восстановиться открытой без клика; держим одну колонку.
      singleColumnRightPanel()
      markStats()
      syncOverlayVisibility()
      // Ящик мог открыться до отрисовки колонки или остаться после перехода.
      // Пустую панель закрываем; поле поиска внутри ящика не трогаем.
      if (drawerOpen && Date.now() - drawerOpenedAt > 700 && !hasSidebarContent()
        && document.activeElement?.closest(':is([class$="_sidebarCol"], [class*="_sidebarCol "])') === null) {
        closeDrawerLight()
      }
      if (!closedOnce && !drawerOpen && document.documentElement.hasAttribute('data-dshm-drawer')) {
        document.documentElement.removeAttribute('data-dshm-drawer')
      }
      closedOnce = true
    }
    // Пока человек ни к чему не прикасался, клавиатуру не показываем.
    //
    // Клиент при загрузке ставит фокус в поле ввода, и приложение открывается сразу с
    // поднятой клавиатурой — для человека это выглядит как «приложение само начало
    // печатать». Любое касание снимает это правило: дальше решает он.
    let userTouched = false
    const markTouched = () => { userTouched = true }
    for (const type of ['pointerdown', 'touchstart', 'keydown']) {
      window.addEventListener(type, markTouched, { once: true, capture: true, passive: true })
    }
    // Пустой ящик не должен висеть на экране даже один тик: проверяем часто,
    // пока он открыт, и закрываем, как только содержимое пропало.
    if (drawerOpen) ensureDrawerGuard()

    const focusGuard = setInterval(() => {
      if (userTouched) {
        clearInterval(focusGuard)
        return
      }
      const active = document.activeElement
      if (isTextEntry(active)) active.blur()
    }, 300)
    // Один тикер вместо пяти: каждый проход делает срочное, а редкое — по счётчику.
    //
    // Было: 800 мс (пометки/вопросы/завершение/карточка плана), 1500 мс
    // (closeOnNavigate — на самом деле одноразовая привязка обработчика, его
    // достаточно вызвать при старте), 2500 мс (убрать настольные кнопки),
    // 1200 мс (панель клиента), 1200 мс (строка «Продолжить»). Каждый обход — это
    // поиск по всему DOM, и на длинной переписке они складывались.
    let passes = 0
    setInterval(() => {
      if (paused()) return
      tick()
      notifyQuestion()
      watchCompletion()
      keepPlanCardVisible()
      closeEmptyRightPanel()
      passes += 1
      if (passes % 2 === 0) {
        // closeOnNavigate вешает обработчик на колонку клиента; после перерисовки
        // колонка может замениться, поэтому привязку проверяем периодически.
        closeOnNavigate()
        keepClientPanelOpen()
        rememberBar()
      }
      if (passes % 4 === 0) hideLegacyMobileAccess()
    }, 800)
    blurOnButtonClick()
    guardComposerMenuFocus()
    installTerminalKeyboard()
    installQuestionEnterNewline()
    tick()
  }

  /**
   * Пометить строку статистики хода (токены/с, попадание в кэш).
   *
   * Раньше здесь был полный обход `div, p, span` всей страницы с чтением
   * `getBoundingClientRect` у каждого кандидата — каждые 800 мс, и это давало
   * редкие кадры по 58–117 мс на длинной переписке (замер с выключенными
   * таймерами слоя: 42 мс против 117). Строка живёт в доке композера: девять
   * узлов вместо тысяч, и английский шаблон заменён на оба языка — русский
   * интерфейс раньше не помечался вовсе.
   */
  /**
   * Закрыть нижнюю шторку клиента (команда агентов/субагенты/фоновые задачи).
   *
   * Клиент закрывает такие панели по Escape; кнопка «×» в шторке делает то же.
   */
  function closeToolSheet() {
    const sheet = document.querySelector('[data-dshm-sheet]')
    if (sheet !== null) {
      const dispatchEscape = () => sheet.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true,
      }))
      dispatchEscape()
      sheet.removeAttribute('data-dshm-sheet')
      sheet.querySelectorAll('.dshm-sheet-close, .dshm-sheet-handle').forEach((element) => element.remove())
      for (const scrim of document.querySelectorAll('.dshm-sheet-scrim')) {
        scrim.dataset.dshmShow = '0'
        window.setTimeout(() => scrim.remove(), 220)
      }
      // Страховка: некоторые панели клиента не слушают Escape. Тогда закрываем
      // их собственной кнопкой, чтобы шторка не осталась висеть.
      window.setTimeout(() => {
        if (!sheet.isConnected) return
        const close = sheet.querySelector('[class*="_close"], button[aria-label*="Закрыть"], button[aria-label*="Close"]')
        if (close !== null) close.click()
      }, 120)
    }
    for (const button of document.querySelectorAll('.dshm-tool[aria-expanded="true"]')) {
      button.setAttribute('aria-expanded', 'false')
    }
  }

  /**
   * Найти панель клиента, которую только что открыла скрытая кнопка, и превратить
   * её в нижнюю шторку: выпадашка привязана к кнопке в скрытой шапке и рисуется в
   * левом верхнем углу без прокрутки.
   *
   * @param {Element} source скрытая кнопка шапки.
   * @param {Element} tool наша кнопка панели.
   */
  function markToolSheet(source, tool) {
    // Модуль клиента по хешу класса: кнопка `_2tNPVa_trigger` открывает панель
    // `_2tNPVa_panel`, `Z0Zh9q_trigger` — меню `Z0Zh9q_menu`. Так мы никогда не
    // примем за шторку уже открытую правую панель или чужой диалог.
    const firstClass = (String(source.className).split(/\s+/u)[0] ?? '').replace(/^_/u, '')
    const modulePrefix = firstClass.split('_')[0]
    const snapshot = new Set(document.querySelectorAll('[role=dialog], [class*="_menu"], [class*="_panel"]'))
    const pool = modulePrefix === ''
      ? '[role=dialog], [class*="_menu"], [class*="_panel"]'
      : `[role=dialog], [class*="${modulePrefix}"], [class*="_menu"], [class*="_panel"]`
    const ours = (element) => element.closest('[class*="_composerStack"]') !== null
      || element.closest('[class*="_sidebarCol"]') !== null
      || element.closest('[data-sidebar-right-panel]') !== null
      || element.closest('[class*="tabHost"]') !== null
      || element.closest('[data-queue-dock]') !== null
      || element.closest('[data-shortcut-modal]') !== null
    source.click()
    window.setTimeout(() => {
      const candidates = [...document.querySelectorAll(pool)]
        .filter((element) => {
          if (element.hasAttribute('data-dshm-sheet')) return false
          if (ours(element)) return false
          const className = String(element.className)
          const isNew = !snapshot.has(element)
          const sameModule = modulePrefix !== '' && className.includes(modulePrefix)
          // Модульный хеш — предпочтительный признак; если клиент сменил хеш,
          // спасает сравнение «что появилось после клика».
          if (!isNew && !sameModule) return false
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return rect.width > 200 && rect.height > 60 && rect.bottom > 0 && rect.top < window.innerHeight
            && (style.position === 'fixed' || style.position === 'absolute')
        })
        .sort((a, b) => (Number(String(b.className).includes(modulePrefix)) - Number(String(a.className).includes(modulePrefix))))
      const sheet = candidates[0]
      if (sheet === undefined) return
      sheet.setAttribute('data-dshm-sheet', '')
      sheet.dataset.dshmSheetToken = SHEET_TOKEN
      const scrim = document.createElement('div')
      scrim.className = 'dshm-sheet-scrim'
      scrim.dataset.dshmShow = '0'
      scrim.addEventListener('click', closeToolSheet)
      document.body.appendChild(scrim)
      window.requestAnimationFrame(() => { scrim.dataset.dshmShow = '1' })
      const close = document.createElement('button')
      close.type = 'button'
      close.className = 'dshm-sheet-close'
      close.setAttribute('aria-label', tr('Закрыть'))
      close.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        closeToolSheet()
      })
      sheet.appendChild(close)
      const handle = document.createElement('div')
      handle.className = 'dshm-sheet-handle'
      sheet.appendChild(handle)
      let dragStart = null
      let dragY = 0
      handle.addEventListener('pointerdown', (event) => {
        dragStart = event.clientY
        dragY = 0
        sheet.style.transition = 'none'
        handle.setPointerCapture?.(event.pointerId)
      })
      handle.addEventListener('pointermove', (event) => {
        if (dragStart === null) return
        dragY = Math.max(0, event.clientY - dragStart)
        sheet.style.transform = `translateY(${String(dragY)}px)`
        const sheetScrim = document.querySelector('.dshm-sheet-scrim')
        if (sheetScrim !== null) sheetScrim.style.opacity = String(Math.max(0.1, 1 - dragY / 260))
      })
      const endDrag = () => {
        if (dragStart === null) return
        dragStart = null
        if (dragY > 110) {
          sheet.style.transition = 'transform .18s ease-in'
          sheet.style.transform = 'translateY(110%)'
          const sheetScrim = document.querySelector('.dshm-sheet-scrim')
          if (sheetScrim !== null) sheetScrim.style.opacity = '0'
          window.setTimeout(closeToolSheet, 180)
        } else {
          sheet.style.transition = 'transform .28s cubic-bezier(.2,1.15,.3,1)'
          sheet.style.transform = ''
          const sheetScrim = document.querySelector('.dshm-sheet-scrim')
          if (sheetScrim !== null) sheetScrim.style.opacity = ''
        }
        dragY = 0
      }
      handle.addEventListener('pointerup', endDrag)
      handle.addEventListener('pointercancel', endDrag)
      tool.setAttribute('aria-expanded', 'true')
    }, 140)
  }

  /**
   * Создать кнопку нижней панели, которая открывает скрытую кнопку шапки шторкой.
   *
   * @param {string} key стабильный ключ кнопки.
   * @param {RegExp} ariaPattern поиск скрытой кнопки шапки по aria-label.
   * @param {string} label подпись/aria для нашей кнопки.
   * @param {string} svg иконка.
   * @param {Element} dock контейнер нижней панели.
   * @returns {Element|undefined} созданная кнопка.
   */
  function createToolButton(key, ariaPattern, label, svg, dock) {
    const existing = dock.querySelector(`[data-dshm-tool="${key}"]`)
    const findSource = () => [...document.querySelectorAll('button')]
      .find((candidate) => !candidate.classList.contains('dshm-tool')
        && ariaPattern.test(candidate.getAttribute('aria-label') ?? ''))
    const source = findSource()
    if (existing !== null) {
      // Кнопка, у которой больше нет исходной кнопки клиента, — мёртвая. Но
      // источник может исчезнуть на время анимации ящика/диалога: не дёргаем DOM
      // каждый тик, а убираем кнопку после нескольких подряд пропусков. Иначе
      // открытие панели само создаёт длинные задачи (замер: десятки long tasks).
      if (source !== undefined) {
        delete existing.dataset.dshmMissing
        return existing
      }
      const misses = Number(existing.dataset.dshmMissing ?? 0) + 1
      existing.dataset.dshmMissing = String(misses)
      if (misses < 5) return existing
      existing.remove()
    }
    if (source === undefined) return undefined
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.dshmTool = key
    button.className = 'dshm-tool'
    button.setAttribute('aria-label', findSource()?.getAttribute('aria-label') || label)
    button.title = label
    button.innerHTML = svg
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      tapHaptic()
      if (button.getAttribute('aria-expanded') === 'true') {
        closeToolSheet()
        return
      }
      closeToolSheet()
      const source = findSource()
      if (source === undefined) return
      markToolSheet(source, button)
    })
    dock.appendChild(button)
    return button
  }

  /**
   * Короткий тактильный отклик на нажатие инструмента.
   *
   * Сначала пробуем нативный мост (`haptic.tap`), иначе Vibration API. Наличие
   * возможности кешируем, чтобы не опрашивать мост на каждое касание.
   */
  let nativeHaptic = null
  let lastHapticAt = 0

  function tapHaptic() {
    // A tap that lands during a layout transition can be delivered several
    // times; one short pulse per gesture is enough.
    const now = Date.now()
    if (now - lastHapticAt < 150) return
    lastHapticAt = now
    const bridge = window.__DSH_MOBILE_NATIVE__
    if (bridge !== undefined && typeof bridge.invoke === 'function') {
      if (nativeHaptic === null && typeof bridge.capabilities === 'function') {
        bridge.capabilities().then((caps) => {
          nativeHaptic = Array.isArray(caps) && caps.includes('haptic.tap')
        }).catch(() => { nativeHaptic = false })
      }
      if (nativeHaptic === true) {
        try {
          const result = bridge.invoke('haptic.tap', { duration: 8 })
          if (result !== undefined && typeof result.catch === 'function') result.catch(() => { nativeHaptic = false })
          return
        } catch { nativeHaptic = false }
      }
    }
    if (navigator.vibrate) navigator.vibrate(6)
  }

  /** Ключ закрепления для источника сетки ('' — источник не закрепляется). */

  /**
   * Найти именно док композера.
   *
   * В `composerStack` бывает несколько доков: InputBar (data-composer-dock),
   * GoalBar (data-goal-bar, только при активной цели) и QueueDock (data-queue-dock,
   * только при непустой очереди). Раньше брали первый `:is([class$="_dock"], [class*="_dock "])` и при
   * активной цели вставляли кнопки в чужой бар — двойная реализация панели.
   *
   * @returns {Element|null} док композера.
   */
  function composerDock() {
    // В правой панели бывает встроенный разговор со своим composer-dock.
    // Выбираем док активной поверхности, а не первый в документе: иначе слой
    // вставляет кнопки в скрытый основной чат и проверки видят «два дока».
    const docks = [...document.querySelectorAll('[data-composer-dock="true"]')]
    if (docks.length > 0) {
      // Активной панель считаем только когда она реально открыта. После закрытия
      // dockkit оставляет её DOM (и встроенный composer-dock) в документе; если
      // брать его всегда, слой переносит инструменты в скрытую панель, а в
      // основном чате остаются стандартные кнопки.
      const activePanel = document.querySelector('[data-sidebar-right-open]') === null
        ? null
        : document.querySelector('[data-sidebar-right-panel] [data-dockkit-pane-active="true"]')
      let exact = activePanel === null
        ? undefined
        : docks.find((dock) => activePanel.contains(dock))
      if (exact === undefined) {
        exact = docks.find((dock) => visible(dock) && dock.closest('[data-sidebar-right-panel]') === null)
          ?? docks.find((dock) => visible(dock))
          ?? docks[0]
      }
      return exact
    }
    const fallback = [...document.querySelectorAll('[class*="_composerStack"] :is([class$="_dock"], [class*="_dock "])')]
      .find((element) => !element.hasAttribute('data-queue-dock') && !element.hasAttribute('data-goal-bar'))
    if (fallback === undefined) return null
    fallback.setAttribute('data-dshm-composer-dock', '')
    return fallback
  }

  /**
   * Записать data-атрибут только если значение реально меняется.
   *
   * Тикер ходит каждые 800 мс; запись того же значения — лишняя мутация DOM,
   * лишний ResizeObserver/React-шум и риск гонок. Особенно заметно на
   * data-dshm-collapsed/context/dock-hidden.
   *
   * @param {Element} element элемент.
   * @param {string} name имя dataset-ключа.
   * @param {string|null} value новое значение; null — удалить.
   */
  function setAttrIfChanged(element, name, value) {
    if (value === null) {
      if (element.hasAttribute(name)) element.removeAttribute(name)
      return
    }
    if (element.getAttribute(name) !== value) element.setAttribute(name, value)
  }

  /**
   * Убрать наши кнопки и состояние из чужих доков (цель/очередь), если старый слой
   * успел их туда вставить.
   *
   * @param {Element} dock настоящий док композера.
   */
  function cleanupForeignDocks(dock) {
    for (const foreign of document.querySelectorAll(':is([class$="_dock"], [class*="_dock "])')) {
      if (foreign === dock) continue
      foreign.querySelectorAll('.dshm-tool, .dshm-dock-toggle, [data-dshm-grid]').forEach((element) => element.remove())
      for (const name of ['dshmScroll', 'dshmCollapsed', 'dshmDragging', 'dshmBound', 'dshmEnter', 'dshmSeen', 'dshmTips', 'dshmDragBound', 'dshmReady', 'dshmTouched']) {
        delete foreign.dataset[name]
      }
    }
  }

  /** Ключ скрытых из дока инструментов. */
  const HIDDEN_KEY = 'dshm.dockHidden'

  /** Прочитать скрытые из дока инструменты. */
  function readHidden() {
    try {
      const value = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
    } catch { return [] }
  }

  /** Записать скрытые из дока инструменты. */
  function writeHidden(list) {
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(list)) } catch {}
  }

  /** Ключ инструмента для скрытия/показа: стат-кнопки тоже участвуют. */
  function dockKey(source) {
    const key = sourceKey(source)
    if (key !== '') return key
    const aria = (source.getAttribute('aria-label') || '').trim()
    if (/^Ходов|Turns\b/iu.test(aria)) return 'stat:activity'
    if (/токен|oken/iu.test(aria)) return 'stat:tokens'
    if (/контекст|context/iu.test(aria)) return 'stat:context'
    return ''
  }

  /** Ключ «док свёрнут». */
  const COLLAPSED_KEY = 'dshm.dockCollapsed'

  /** Прочитать состояние «док свёрнут». */
  function readCollapsed() {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1' } catch { return false }
  }

  /** Записать состояние «док свёрнут». */
  function writeCollapsed(value) {
    try { localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0') } catch {}
  }

  /** Ключ сохранённого порядка дока. */
  const ORDER_KEY = 'dshm.dockOrder'

  /** Прочитать сохранённый порядок инструментов. */
  function readOrder() {
    try {
      const value = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]')
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
    } catch { return [] }
  }

  /** Записать порядок инструментов. */
  function writeOrder(list) {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(list)) } catch {}
  }

  /** Ключ источника для сетки/закрепления. */
  function sourceKey(source) {
    if (source.dataset.dshmTool !== undefined) return source.dataset.dshmTool
    if (source.dataset.dshmAction !== undefined) return source.dataset.dshmAction
    return ''
  }

  /**
   * Короткая подпись для плитки сетки инструментов.
   *
   * @param {Element} source кнопка дока или клиента.
   * @returns {string} подпись.
   */
  function toolLabel(source) {
    const aria = (source.getAttribute('aria-label') || source.title || '').trim()
    if (/^(Ходов|Turns)[:\s]/iu.test(aria)) return tr('Статистика')
    if (/субагент|subagent/iu.test(aria)) return tr('Субагенты')
    if (/фоновая задача|background task/iu.test(aria)) return tr('Фоновые задачи')
    if (/токен|oken/i.test(aria)) return tr('Токены')
    if (/контекст|context/i.test(aria)) return tr('Контекст')
    return aria.length > 28 ? `${aria.slice(0, 27)}…` : aria
  }

  /** Токен экземпляра слоя: помечает шторки, созданные именно этим слоем. */
  const SHEET_TOKEN = `${String(Date.now())}-${String(Math.random()).slice(2, 8)}`

  /** Показывался ли брифинг в этой загрузке страницы. */
  let onboardingShown = false

  /**
   * Показать короткий брифинг первого запуска.
   *
   * @param {boolean} force показать заново, даже если уже видели.
   */
  function showOnboarding(force = false) {
    if (!force) {
      if (onboardingShown || document.querySelector('.dshm-onboard') !== null) return
      try { if (localStorage.getItem('dshm.onboardingSeen') === '1') return } catch { return }
    } else {
      document.querySelector('.dshm-onboard')?.remove()
    }
    onboardingShown = true
    const steps = [
      { icon: '⌘', title: 'DDeck — это ваш компьютер', text: 'Чаты, файлы, терминал и настройки работают на Mac. Телефон только показывает и управляет.' },
      { icon: '⋯', title: 'Нижняя панель — быстрые инструменты', text: 'Листайте её влево-вправо. Кнопка с точками открывает все инструменты; свайп вверх по панели делает то же самое.' },
      { icon: '☑', title: 'Соберите панель под себя', text: 'В сетке нажмите «Изменить» и коснитесь плитки: инструмент убирается из панели или возвращается. Лишние остаются в меню.' },
      { icon: '↔', title: 'Порядок и управление', text: 'Долгое нажатие на иконке — перетащить. Шеврон справа сворачивает панель. Настройки — «Вы вошли в DeepSeek».' },
    ]
    let step = 0
    const overlay = document.createElement('div')
    overlay.className = 'dshm-onboard'
    overlay.dataset.dshmShow = '0'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', tr('Как пользоваться DDeck'))
    const card = document.createElement('div')
    card.className = 'dshm-onboard-card'
    const icon = document.createElement('div')
    icon.className = 'dshm-onboard-icon'
    const title = document.createElement('div')
    title.className = 'dshm-onboard-title'
    const text = document.createElement('p')
    text.className = 'dshm-onboard-text'
    const foot = document.createElement('div')
    foot.className = 'dshm-onboard-foot'
    const dots = document.createElement('div')
    dots.className = 'dshm-onboard-dots'
    const actions = document.createElement('div')
    actions.className = 'dshm-onboard-actions'
    const skip = document.createElement('button')
    skip.type = 'button'
    skip.className = 'dshm-onboard-skip'
    skip.textContent = tr('Пропустить')
    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'dshm-onboard-next'
    actions.append(skip, next)
    foot.append(dots, actions)
    card.append(icon, title, text, foot)
    overlay.append(card)

    const finish = () => {
      try { localStorage.setItem('dshm.onboardingSeen', '1') } catch {}
      overlay.dataset.dshmShow = '0'
      window.setTimeout(() => overlay.remove(), 220)
    }
    const render = () => {
      const current = steps[step]
      icon.textContent = current.icon
      title.textContent = tr(current.title)
      text.textContent = tr(current.text)
      dots.replaceChildren(...steps.map((_, index) => {
        const dot = document.createElement('span')
        dot.className = 'dshm-onboard-dot'
        if (index === step) dot.dataset.dshmActive = '1'
        return dot
      }))
      next.textContent = step === steps.length - 1 ? tr('Понятно') : tr('Далее')
      skip.textContent = step === steps.length - 1 ? tr('Закрыть') : tr('Пропустить')
    }
    skip.addEventListener('click', finish)
    next.addEventListener('click', () => {
      if (step === steps.length - 1) {
        finish()
        return
      }
      step += 1
      render()
    })
    render()
    document.body.appendChild(overlay)
    window.requestAnimationFrame(() => { overlay.dataset.dshmShow = '1' })
  }

  /** Закрыть сетку инструментов. */
  function closeToolGrid() {
    const grid = document.querySelector('.dshm-grid')
    const scrim = document.querySelector('.dshm-grid-scrim')
    if (grid !== null) grid.dataset.dshmShow = '0'
    if (scrim !== null) scrim.dataset.dshmShow = '0'
    window.setTimeout(() => {
      grid?.remove()
      scrim?.remove()
    }, 220)
  }

  /**
   * Открыть сетку всех инструментов: док листается, а сетка показывает всё сразу.
   */
  function openToolGrid() {
    if (document.querySelector('.dshm-grid') !== null) {
      closeToolGrid()
      return
    }
    const dock = composerDock()
    if (dock === null) return
    const scrim = document.createElement('div')
    scrim.className = 'dshm-grid-scrim'
    scrim.dataset.dshmShow = '0'
    scrim.addEventListener('click', closeToolGrid)
    const grid = document.createElement('div')
    grid.className = 'dshm-grid'
    grid.setAttribute('role', 'dialog')
    grid.setAttribute('aria-label', tr('Все инструменты'))
    grid.dataset.dshmShow = '0'
    const header = document.createElement('div')
    header.className = 'dshm-grid-header'
    const title = document.createElement('div')
    title.className = 'dshm-grid-title'
    title.textContent = tr('Инструменты')
    const edit = document.createElement('button')
    edit.type = 'button'
    edit.className = 'dshm-grid-edit'
    edit.textContent = tr('Изменить')
    edit.setAttribute('aria-label', tr('Настройка нижней панели'))
    const reset = document.createElement('button')
    reset.type = 'button'
    reset.className = 'dshm-grid-edit dshm-grid-reset'
    reset.textContent = tr('Сбросить')
    reset.setAttribute('aria-label', tr('Вернуть все инструменты в панель'))
    reset.dataset.dshmHidden = '1'
    edit.addEventListener('click', () => {
      const active = grid.dataset.dshmEdit === '1'
      grid.dataset.dshmEdit = active ? '0' : '1'
      edit.dataset.dshmActive = active ? '0' : '1'
      edit.textContent = active ? tr('Изменить') : tr('Готово')
      reset.dataset.dshmHidden = active ? '1' : '0'
    })
    reset.addEventListener('click', () => {
      writeHidden([])
      for (const cell of grid.querySelectorAll('.dshm-grid-cell')) {
        cell.dataset.dshmDockHidden = '0'
      }
    })
    const info = document.createElement('button')
    info.type = 'button'
    info.className = 'dshm-grid-info'
    info.setAttribute('aria-label', tr('Как пользоваться'))
    info.textContent = '?'
    info.addEventListener('click', () => {
      closeToolGrid()
      window.setTimeout(() => showOnboarding(true), 120)
    })
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'dshm-grid-close'
    close.setAttribute('aria-label', tr('Закрыть'))
    close.textContent = '×'
    close.addEventListener('click', closeToolGrid)
    header.append(title, edit, reset, info, close)
    const search = document.createElement('input')
    search.className = 'dshm-grid-search'
    search.type = 'search'
    search.placeholder = tr('Поиск инструмента')
    search.setAttribute('aria-label', tr('Поиск инструмента'))
    const cells = document.createElement('div')
    cells.className = 'dshm-grid-cells'

    const sources = [
      ...[...dock.querySelectorAll('button')].filter((button) => button.dataset.dshmTool === undefined
        && button.dataset.dshmAction === undefined && button.dataset.dshmGrid === undefined
        && !button.classList.contains('dshm-dock-toggle')),
      ...[...dock.querySelectorAll('[data-dshm-tool], [data-dshm-action]')],
    ]
    const synonyms = uiLang() === 'en'
      ? {
          menu: 'sidebar sessions drawer',
          newSession: 'new chat session',
          search: 'search find',
          plugins: 'plugins extensions',
          tasks: 'automations schedule tasks',
          files: 'files terminal right panel',
          agents: 'agent team agents',
          subagents: 'subagents agents',
          jobs: 'background tasks jobs',
        }
      : {
          menu: 'сессии ящик боковая панель',
          newSession: 'новый чат сессия',
          search: 'поиск найти',
          plugins: 'плагины расширения',
          tasks: 'автозадачи расписание автоматические',
          files: 'файлы терминал правая панель',
          agents: 'команда агентов команда',
          subagents: 'субагенты агенты',
          jobs: 'фоновые задачи фон',
        }
    const hidden = readHidden()
    for (const source of sources) {
      const key = dockKey(source)
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'dshm-grid-cell'
      cell.dataset.dshmKey = key
      cell.dataset.dshmPinnable = key === '' ? '0' : '1'
      const label = toolLabel(source)
      const extra = key === '' ? '' : (synonyms[key] ?? '')
      cell.dataset.dshmLabel = `${label} ${extra}`.toLowerCase()
      cell.dataset.dshmDockHidden = key !== '' && hidden.includes(key) ? '1' : '0'
      const icon = source.querySelector('svg')
      if (icon !== null) cell.appendChild(icon.cloneNode(true))
      const labelElement = document.createElement('span')
      labelElement.textContent = label
      cell.appendChild(labelElement)
      cell.addEventListener('click', () => {
        tapHaptic()
        if (grid.dataset.dshmEdit === '1') {
          if (cell.dataset.dshmPinnable !== '1') return
          const list = readHidden()
          const index = list.indexOf(key)
          if (index >= 0) list.splice(index, 1)
          else list.push(key)
          writeHidden(list)
          cell.dataset.dshmDockHidden = list.includes(key) ? '1' : '0'
          return
        }
        closeToolGrid()
        window.setTimeout(() => source.click(), 120)
      })
      cells.appendChild(cell)
    }
    if (cells.children.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'dshm-grid-empty'
      empty.textContent = tr('Инструменты появятся, когда откроется чат')
      cells.appendChild(empty)
    }
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase()
      for (const cell of cells.querySelectorAll('.dshm-grid-cell')) {
        cell.dataset.dshmHidden = query !== '' && !cell.dataset.dshmLabel.includes(query) ? '1' : '0'
      }
    })
    grid.append(header, search, cells)
    document.body.append(scrim, grid)
    window.requestAnimationFrame(() => {
      scrim.dataset.dshmShow = '1'
      grid.dataset.dshmShow = '1'
    })
  }

  /**
   * Долгое нажатие с перетаскиванием: инструменты дока можно менять местами.
   *
   * Короткое нажатие остаётся нажатием, горизонтальный свайп — обычная прокрутка.
   * После удержания 300 мс кнопка «приподнимается», движение меняет порядок, отпускание
   * сохраняет его в localStorage.
   *
   * @param {Element} dock контейнер дока.
   */
  function bindDockDrag(dock) {
    if (dock.dataset.dshmDragBound === '1') return
    dock.dataset.dshmDragBound = '1'
    // Android WebView открывает меню выделения/контекстное меню на долгом
    // нажатии и отбирает жест — перетаскивание не начиналось. Гасим его.
    dock.addEventListener('contextmenu', (event) => event.preventDefault(), { capture: true })
    let candidate = null
    let dragging = null
    let timer = 0
    let startX = 0
    let startY = 0
    let suppressClickUntil = 0
    // Горизонтальная прокрутка дока: touch-action:none нужен для долгого
    // нажатия/перетаскивания, поэтому прокрутку ведём вручную, с инерцией.
    let scrolling = false
    let lastX = 0
    let velocity = 0
    let momentumFrame = 0

    /** Все переставляемые кнопки, кроме несъёмной сетки. */
    const movable = () => [...dock.querySelectorAll('[data-dshm-tool], [data-dshm-action]')]
      .filter((button) => !button.hasAttribute('data-dshm-grid'))

    const stopMomentum = () => {
      if (momentumFrame !== 0) {
        window.cancelAnimationFrame(momentumFrame)
        momentumFrame = 0
      }
    }
    const startMomentum = () => {
      stopMomentum()
      const step = () => {
        momentumFrame = 0
        if (Math.abs(velocity) < 0.5) return
        dock.scrollLeft += velocity
        velocity *= 0.92
        momentumFrame = window.requestAnimationFrame(step)
      }
      if (Math.abs(velocity) >= 0.5) momentumFrame = window.requestAnimationFrame(step)
    }

    const finish = () => {
      window.clearTimeout(timer)
      if (scrolling) startMomentum()
      scrolling = false
      edgeDirection = 0
      if (edgeFrame !== 0) {
        window.cancelAnimationFrame(edgeFrame)
        edgeFrame = 0
      }
      if (dragging !== null) {
        dragging.classList.remove('dshm-dragging')
        dock.dataset.dshmDragging = '0'
        dock.style.touchAction = ''
        writeOrder(movable().map((button) => sourceKey(button)).filter((key) => key !== ''))
        suppressClickUntil = Date.now() + 350
      }
      candidate = null
      dragging = null
    }

    dock.addEventListener('pointerdown', (event) => {
      stopMomentum()
      scrolling = false
      velocity = 0
      const target = event.target instanceof Element ? event.target.closest('[data-dshm-tool], [data-dshm-action]') : null
      if (target === null || target.hasAttribute('data-dshm-grid')) return
      candidate = target
      startX = event.clientX
      startY = event.clientY
      lastX = event.clientX
      // Захват указателя: движение продолжает приходить в док, даже если палец
      // ушёл за пределы кнопки/контейнера.
      try { target.setPointerCapture(event.pointerId) } catch { /* старые WebView */ }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (candidate === null) return
        stopMomentum()
        dragging = candidate
        tapHaptic()
        dragging.classList.add('dshm-dragging')
        dock.dataset.dshmDragging = '1'
        dock.style.touchAction = 'none'
        for (const tip of document.querySelectorAll('.dshm-tip')) tip.dataset.dshmShow = '0'
      }, 250)
    }, { passive: true })

    /** Переставить перетаскиваемую кнопку под координату x с FLIP-анимацией соседей. */
    const reorderAt = (x) => {
      const order = movable()
      const before = new Map(order.map((button) => [button, button.getBoundingClientRect()]))
      const target = order.find((button) => {
        if (button === dragging) return false
        const rect = button.getBoundingClientRect()
        return x < rect.left + rect.width / 2
      })
      if (target === undefined) dock.appendChild(dragging)
      else dock.insertBefore(dragging, target)
      // FLIP: остальные кнопки плавно доезжают на новое место.
      for (const [button, oldRect] of before) {
        if (button === dragging) continue
        const newRect = button.getBoundingClientRect()
        const delta = oldRect.left - newRect.left
        if (Math.abs(delta) < 1) continue
        button.animate(
          [{ transform: `translateX(${String(delta)}px)` }, { transform: 'translateX(0)' }],
          { duration: 140, easing: 'cubic-bezier(.2,.8,.2,1)' },
        )
      }
    }

    // Магнит к краям: у края дока прокрутка продолжается сама, чтобы перетащить
    // инструмент через весь список.
    let edgeDirection = 0
    let edgeFrame = 0
    let lastPointerX = 0
    const edgeStep = () => {
      edgeFrame = 0
      if (dragging === null || edgeDirection === 0) return
      const before = dock.scrollLeft
      dock.scrollLeft += edgeDirection * 14
      if (dock.scrollLeft !== before) reorderAt(lastPointerX)
      edgeFrame = window.requestAnimationFrame(edgeStep)
    }
    const updateEdge = (x) => {
      const rect = dock.getBoundingClientRect()
      const next = x < rect.left + 36 ? -1 : x > rect.right - 36 ? 1 : 0
      if (next === edgeDirection) return
      edgeDirection = next
      if (next !== 0 && edgeFrame === 0) edgeFrame = window.requestAnimationFrame(edgeStep)
    }

    dock.addEventListener('pointermove', (event) => {
      if (dragging !== null) {
        if (event.cancelable) event.preventDefault()
        lastPointerX = event.clientX
        reorderAt(lastPointerX)
        updateEdge(lastPointerX)
        return
      }
      if (scrolling) {
        if (event.cancelable) event.preventDefault()
        const delta = lastX - event.clientX
        dock.scrollLeft += delta
        velocity = delta
        lastX = event.clientX
        suppressClickUntil = Date.now() + 350
        return
      }
      if (candidate === null) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.abs(dx) > 10 && Math.abs(dx) >= Math.abs(dy)) {
        window.clearTimeout(timer)
        candidate = null
        scrolling = true
        lastX = event.clientX
        velocity = 0
        suppressClickUntil = Date.now() + 350
        if (event.cancelable) event.preventDefault()
        return
      }
      if (Math.abs(dy) > 14 || Math.abs(dx) > 14) {
        window.clearTimeout(timer)
        candidate = null
      }
    }, { passive: false })

    dock.addEventListener('pointerup', finish)
    dock.addEventListener('pointercancel', finish)
    dock.addEventListener('click', (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault()
        event.stopPropagation()
      }
    }, true)
  }

  /**
   * Кнопка-действие нижней панели: нажатие просто вызывает скрытую кнопку клиента.
   *
   * Так в док попадают навигация и панели без дублирования логики клиента.
   *
   * @param {string} key стабильный ключ.
   * @param {string} label подпись/aria.
   * @param {string} svg иконка.
   * @param {() => Element|undefined|null} findSource поиск исходной кнопки.
   * @param {Element} dock контейнер дока.
   * @returns {Element|undefined} созданная кнопка.
   */
  function createActionButton(key, label, svg, findSource, dock) {
    const existing = dock.querySelector(`[data-dshm-action="${key}"]`)
    const source = findSource()
    if (existing !== null) {
      if (source !== null && source !== undefined) {
        delete existing.dataset.dshmMissing
        return existing
      }
      const misses = Number(existing.dataset.dshmMissing ?? 0) + 1
      existing.dataset.dshmMissing = String(misses)
      if (misses < 5) return existing
      existing.remove()
    }
    if (source === null || source === undefined) return undefined
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.dshmAction = key
    button.className = 'dshm-tool'
    button.setAttribute('aria-label', label)
    button.title = label
    button.innerHTML = svg
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      tapHaptic()
      const dockElement = button.parentElement
      if (dockElement !== null) delete dockElement.dataset.dshmUnread
      if (key === 'search' && !drawerOpen) {
        // Открываем native drawer ДО клика по поиску: иначе поиск создаётся
        // внутри ещё закрытого ящика и поле остаётся за viewport.
        setDrawer(true)
        window.setTimeout(() => findSource()?.click(), 300)
      } else {
        const source = findSource()
        if (source === null || source === undefined) return
        source.click()
      }
      // Подсветка «инструмент открыт»: панель/ящик появляются после клика,
      // поэтому состояние снимаем чуть позже.
      const sync = () => {
        if (key === 'menu') {
          button.setAttribute('aria-expanded', document.documentElement.hasAttribute('data-dshm-drawer') ? 'true' : 'false')
        } else if (key === 'files') {
          button.setAttribute('aria-expanded', rightPanelVisible ? 'true' : 'false')
        }
      }
      for (const delay of [80, 300, 800]) window.setTimeout(sync, delay)
    })
    dock.appendChild(button)
    return button
  }


  /**
   * Кнопка-шеврон в строке композера, как у нативных меню модели/доступа.
   *
   * Сам док при сворачивании исчезает целиком; шеврон остаётся на своём месте
   * и меняет направление стрелки. Раньше он жил внутри дока и исчезал вместе с
   * ним, поэтому свернуть/развернуть можно было только сеткой «Все инструменты».
   */
  function ensureDockToggle(dock) {
    const trailing = [...document.querySelectorAll(':is([class$="_trailing"], [class*="_trailing "])')]
      .find((element) => element.closest('[class*="_composerStack"]') !== null
        && element.getBoundingClientRect().width > 0
        && element.querySelector('button') !== null)
    const oldDockToggle = dock?.querySelector('.dshm-dock-toggle')
    if (oldDockToggle !== null && oldDockToggle !== undefined) oldDockToggle.remove()
    if (trailing === undefined) {
      document.querySelector('.dshm-dock-toggle')?.remove()
      return
    }
    let toggle = trailing.querySelector('.dshm-dock-toggle')
    if (toggle === null) {
      toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.className = 'dshm-dock-toggle'
      toggle.innerHTML = '<span class="dshm-dock-toggle-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h10M4 17h16"/></svg></span><span class="dshm-dock-toggle-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>'
      toggle.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        tapHaptic()
        const next = document.documentElement.getAttribute('data-dshm-dock-collapsed') !== '1'
        writeCollapsed(next)
        setAttrIfChanged(document.documentElement, 'data-dshm-dock-collapsed', next ? '1' : '0')
      })
    }
    const activity = [...trailing.children]
      .find((element) => /activity/iu.test(String(element.className)))
    const primary = [...trailing.querySelectorAll('button')]
      .find((button) => /primary/iu.test(String(button.className)))
    const anchor = activity ?? primary ?? null
    if (toggle.parentElement !== trailing) trailing.insertBefore(toggle, anchor)
    else if (toggle.nextElementSibling !== anchor) trailing.insertBefore(toggle, anchor)
    const collapsed = readCollapsed()
    const label = collapsed ? tr('Развернуть панель инструментов') : tr('Свернуть панель инструментов')
    setAttrIfChanged(toggle, 'aria-expanded', collapsed ? 'false' : 'true')
    setAttrIfChanged(toggle, 'aria-label', label)
    setAttrIfChanged(toggle, 'title', label)
  }

  /**
   * Обновить градиенты-подсказки прокрутки дока по его позиции.
   *
   * @param {Element} dock контейнер дока.
   */
  function syncDockScroll(dock) {
    const max = dock.scrollWidth - dock.clientWidth
    const left = dock.scrollLeft
    const next = max <= 1 ? 'none' : left <= 8 ? 'start' : left >= max - 8 ? 'end' : 'middle'
    setAttrIfChanged(dock, 'data-dshm-scroll', next)
  }

  /**
   * Нижняя панель инструментов и кнопка сворачивания ящика.
   *
   * Владелец продукта: длинные подписи статистики не нужны — нужны кнопки. Клиент
   * уже даёт кнопки статистики с полным текстом в aria-label и открывает по нажатию
   * родные диалоги, поэтому подписи прячем, а кнопки делаем квадратными 44 px.
   * Скрытые кнопки шапки (команда агентов, субагенты, фоновые задачи) переносим в
   * панель: до них нельзя дотянуться, а их панели превращаем в нижние шторки.
   */
  function markStats() {
    const dock = composerDock()
    if (dock !== null) {
      cleanupForeignDocks(dock)
      for (const element of dock.querySelectorAll('[data-dshm-meta]')) element.removeAttribute('data-dshm-meta')
      const icons = {
        agents: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M9 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm7 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-7 2c-3.3 0-6 1.8-6 4v2h12v-2c0-2.2-2.7-4-6-4Zm7 0c-.4 0-.9 0-1.3.1A5.7 5.7 0 0 1 17 17v2h5v-2c0-1.9-2.2-3.5-5-3.5Z"/></svg>',
        subagents: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2V12M12 12H5v4.8M12 12h7v4.8"/></svg>',
        jobs: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
      }
      createToolButton('agents', /Команда агентов|Agent team/i, tr('Команда агентов'), icons.agents, dock)
      createToolButton('subagents', /^\d+\s+(субагент|subagent)/iu, tr('Субагенты'), icons.subagents, dock)
      createToolButton('jobs', /^\d*\s*(фонов\w*\s+задач|background\s+(?:task|job))/iu, tr('Фоновые задачи'), icons.jobs, dock)

      // Навигация и панели — рядом со статистикой, всё под большим пальцем.
      const navIcons = {
        menu: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h10M4 17h16"/></svg>',
        newSession: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
        search: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
        plugins: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
        tasks: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
        files: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M9 4v16"/></svg>',
      }
      const findButton = (pattern) => [...document.querySelectorAll('button')]
        .find((button) => pattern.test((button.getAttribute('aria-label') || '').trim()))
      createActionButton('menu', tr('Боковое меню'), navIcons.menu, () => document.querySelector('.dshm-menu'), dock)
      createActionButton('newSession', tr('Новая сессия'), navIcons.newSession,
        () => findButton(/^(Новая сессия( в|$)|New session( in|$)|新建会话)/iu), dock)
      createActionButton('search', tr('Поиск сессий'), navIcons.search,
        () => findButton(/^(Поиск сессий|Поиск сеансов|Search sessions|搜索会话|搜索)$/iu), dock)
      createActionButton('plugins', tr('Плагины'), navIcons.plugins,
        () => findButton(/^(Плагины|Plugins|插件)$/iu), dock)
      createActionButton('tasks', tr('Автоматические задачи'), navIcons.tasks,
        () => findButton(/^(Автоматические задачи|Задачи автоматизации|Automations|自动任务)$/iu), dock)
      createActionButton('files', tr('Правая панель'), navIcons.files,
        () => {
          // Стабильные data-хуки вместо переводимых aria-label.
          const expand = document.querySelector('[data-sidebar-right-expand]')
          const close = [...document.querySelectorAll('[data-sidebar-right-toggle]')]
            .find((button) => button.getBoundingClientRect().width > 0)
          return rightPanelVisible ? (close ?? expand) : (expand ?? close)
        }, dock)

      // Бейджи-счётчики и подсветка открытых панелей: док показывает состояние,
      // а не только запускает действия.
      const setBadge = (button, count) => {
        if (button === null || button === undefined) return
        let badge = button.querySelector('.dshm-badge')
        if (count > 0) {
          if (badge === null) {
            badge = document.createElement('span')
            badge.className = 'dshm-badge'
            button.appendChild(badge)
          }
          badge.textContent = String(count)
        } else if (badge !== null) badge.remove()
      }
      const refreshCount = (key, pattern) => {
        const button = dock.querySelector(`[data-dshm-tool="${key}"]`)
        if (button === null) return
        const source = [...document.querySelectorAll('button')]
          .find((candidate) => !candidate.classList.contains('dshm-tool')
            && pattern.test(candidate.getAttribute('aria-label') ?? ''))
        if (source === undefined) return
        // Подпись кнопки остаётся локализованной; обновляем только счётчик.
        const aria = source.getAttribute('aria-label') || ''
        const match = /(\d+)/u.exec(aria)
        setBadge(button, match === null ? 0 : Number(match[1]))
      }
      refreshCount('subagents', /^\d+\s+(субагент|subagent)/iu)
      refreshCount('jobs', /^\d*\s*(фоновая задача|background task)/iu)
      // Кнопка-сетка: альтернатива свайпу вверх, всегда в начале дока.
      if (dock.querySelector('[data-dshm-grid]') === null) {
        const gridButton = document.createElement('button')
        gridButton.type = 'button'
        gridButton.dataset.dshmGrid = ''
        gridButton.className = 'dshm-tool'
        gridButton.setAttribute('aria-label', tr('Все инструменты'))
        gridButton.title = tr('Все инструменты')
        gridButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>'
        gridButton.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          tapHaptic()
          if (dock !== null) delete dock.dataset.dshmUnread
          openToolGrid()
        })
        dock.insertBefore(gridButton, dock.firstChild)
      } else if (dock.firstElementChild?.dataset.dshmGrid === undefined) {
        dock.insertBefore(dock.querySelector('[data-dshm-grid]'), dock.firstChild)
      }

      ensureDockToggle(dock)
      setAttrIfChanged(document.documentElement, 'data-dshm-dock-collapsed', readCollapsed() ? '1' : '0')
      if (dock.dataset.dshmSeen !== '1') {
        dock.dataset.dshmSeen = '1'
        dock.dataset.dshmEnter = '1'
        window.setTimeout(() => { delete dock.dataset.dshmEnter }, 260)
      }

      // Первый запуск: брифинг и подсказка, что док листается и раскрывается.
      showOnboarding(false)
      try {
        if (localStorage.getItem('dshm.dockHintShown') !== '1') {
          localStorage.setItem('dshm.dockHintShown', '1')
          const hint = document.createElement('div')
          hint.className = 'dshm-dock-hint'
          hint.textContent = tr('Листайте панель · удерживайте иконку, чтобы переставить')
          document.body.appendChild(hint)
          window.requestAnimationFrame(() => { hint.dataset.dshmShow = '1' })
          window.setTimeout(() => {
            hint.dataset.dshmShow = '0'
            window.setTimeout(() => hint.remove(), 300)
          }, 5_500)
        }
      } catch {}

      // Бегущие фоновые задачи: пульсирующий бейдж.
      const jobsTool = dock.querySelector('[data-dshm-tool="jobs"]')
      if (jobsTool !== null) {
        setAttrIfChanged(jobsTool, 'data-dshm-running', /выполняется|running/i.test(jobsTool.getAttribute('aria-label') ?? '') ? '1' : '0')
      }

      // Живое состояние: идёт ход, заполнение контекста, вспышка завершения.
      const busy = [...document.querySelectorAll('button')]
        .some((button) => /^(Остановить|Stop|停止)\b/u.test((button.getAttribute('aria-label') ?? '').trim()))
      const wasBusy = dock.dataset.dshmBusy === '1'
      setAttrIfChanged(dock, 'data-dshm-busy', busy ? '1' : '0')
      if (wasBusy && !busy) {
        dock.dataset.dshmDone = '1'
        window.setTimeout(() => { delete dock.dataset.dshmDone }, 1_200)
        const away = document.documentElement.hasAttribute('data-dshm-drawer')
          || rightPanelVisible || onSecondaryScreen() || document.hidden
        if (away) dock.dataset.dshmUnread = '1'
      }
      const contextSource = [...dock.querySelectorAll('button')]
        .find((button) => /контекст|context/iu.test(button.getAttribute('aria-label') ?? ''))
      if (contextSource !== undefined) {
        setAttrIfChanged(contextSource, 'data-dshm-context-tool', '1')
        const match = /(\d+)\s*%/u.exec(contextSource.getAttribute('aria-label') ?? '')
        const percent = match === null ? 0 : Number(match[1])
        setAttrIfChanged(dock, 'data-dshm-context', percent >= 95 ? 'crit' : percent >= 80 ? 'warn' : 'ok')
      }

      // Скрытые в сетке инструменты не рисуются в доке (но остаются в меню).
      const hiddenKeys = readHidden()
      for (const element of dock.querySelectorAll('[data-dshm-tool], [data-dshm-action]')) {
        const key = sourceKey(element)
        setAttrIfChanged(element, 'data-dshm-dock-hidden', hiddenKeys.includes(key) ? '1' : null)
      }
      for (const button of dock.querySelectorAll('button')) {
        if (button.dataset.dshmTool !== undefined || button.dataset.dshmAction !== undefined) continue
        const key = dockKey(button)
        if (key === '') continue
        const wrapper = button.closest('[data-composer-stat]') ?? button.parentElement
        if (wrapper === null) continue
        setAttrIfChanged(wrapper, 'data-dshm-dock-hidden', hiddenKeys.includes(key) ? '1' : null)
      }

      // Стабильный порядок: скрытые не мешают, дальше сохранённый порядок и новые.
      const defaultOrder = ['agents', 'subagents', 'jobs', 'menu', 'newSession', 'search', 'plugins', 'tasks', 'files']
      const keyOf = (element) => element.dataset.dshmTool || element.dataset.dshmAction || ''
      const currentOrder = [...dock.children].map(keyOf).filter((key) => key !== '')
      rightPanelVisible = document.querySelector('[data-sidebar-right-open]') !== null
      setAttrIfChanged(document.documentElement, 'data-dshm-right-open', rightPanelVisible ? '' : null)
      const rightOpen = rightPanelVisible
      const contextual = rightOpen && currentOrder.includes('files') ? ['files'] : []
      const savedOrder = readOrder().filter((key) => currentOrder.includes(key) && !contextual.includes(key))
      const desired = [
        ...contextual,
        ...savedOrder,
        ...defaultOrder.filter((key) => currentOrder.includes(key)
          && !contextual.includes(key) && !savedOrder.includes(key)),
      ]
      if (currentOrder.join(',') !== desired.join(',')) {
        for (const key of desired) {
          const element = dock.querySelector(`[data-dshm-tool="${key}"], [data-dshm-action="${key}"]`)
          if (element !== null) dock.appendChild(element)
        }
      }
      bindDockDrag(dock)
      if (dock.dataset.dshmBound !== '') {
        dock.dataset.dshmBound = ''
        dock.addEventListener('scroll', () => syncDockScroll(dock), { passive: true })
        const touched = () => { dock.dataset.dshmTouched = '1' }
        dock.addEventListener('pointerdown', touched, { passive: true })
        dock.addEventListener('touchstart', touched, { passive: true })
        // Свайп вверх по доку раскрывает сетку всех инструментов.
        let swipeStart = null
        dock.addEventListener('touchstart', (event) => {
          const touch = event.touches[0]
          if (touch === undefined) return
          swipeStart = { x: touch.clientX, y: touch.clientY }
        }, { passive: true })
        dock.addEventListener('touchmove', (event) => {
          if (swipeStart === null) return
          const touch = event.touches[0]
          if (touch === undefined) return
          const dy = swipeStart.y - touch.clientY
          const dx = Math.abs(touch.clientX - swipeStart.x)
          if (dy > 36 && dy > dx * 1.6) {
            swipeStart = null
            if (event.cancelable) event.preventDefault()
            openToolGrid()
          }
        }, { passive: false })
        dock.addEventListener('touchend', () => { swipeStart = null }, { passive: true })
      }
      // Пока человек не трогал док, держим его в начале: новые кнопки при отрисовке
      // иначе уводили прокрутку к концу (scroll anchoring клиента).
      if (dock.dataset.dshmTouched !== '1') dock.scrollLeft = 0
      syncDockScroll(dock)

      // Иконки без подписей: долгое нажатие показывает название над кнопкой.
      if (dock.dataset.dshmTips !== '1') {
        dock.dataset.dshmTips = '1'
        let tip = null
        let timer = 0
        const hideTip = () => {
          window.clearTimeout(timer)
          if (tip !== null) tip.dataset.dshmShow = '0'
        }
        const showTip = (button) => {
          if (document.querySelector('.dshm-dragging') !== null) return
          const label = (button.getAttribute('aria-label') || button.title || '').trim()
          if (label === '') return
          if (tip === null) {
            tip = document.createElement('div')
            tip.className = 'dshm-tip'
            document.body.appendChild(tip)
          }
          tip.textContent = label
          const rect = button.getBoundingClientRect()
          tip.style.left = `${Math.min(Math.max(rect.left + rect.width / 2, 60), window.innerWidth - 60)}px`
          tip.style.top = `${Math.max(rect.top - 6, 8)}px`
          tip.dataset.dshmShow = '1'
        }
        dock.addEventListener('pointerdown', (event) => {
          const button = event.target instanceof Element ? event.target.closest('.dshm-tool') : null
          if (button === null) return
          window.clearTimeout(timer)
          timer = window.setTimeout(() => showTip(button), 420)
        }, { passive: true })
        for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'scroll']) {
          dock.addEventListener(type, hideTip, { passive: true })
        }
      }
      // Если шторку закрыли системной «назад»/Escape, снимаем aria-expanded.
      const sheet = document.querySelector('[data-dshm-sheet]')
      for (const button of dock.querySelectorAll('.dshm-tool')) {
        if (button.getAttribute('aria-expanded') === 'true' && sheet === null) button.setAttribute('aria-expanded', 'false')
      }
      // Затемнение шторки не должно оставаться, если клиент закрыл панель сам.
      if (document.querySelector('[data-dshm-sheet]') === null) {
        for (const scrim of document.querySelectorAll('.dshm-sheet-scrim')) {
          scrim.dataset.dshmShow = '0'
          window.setTimeout(() => scrim.remove(), 220)
        }
      }

      // Чужой элемент с нашей меткой (например, правая панель от старой версии
      // слоя) не должен оставаться нижней шторкой.
      for (const marked of document.querySelectorAll('[data-dshm-sheet]')) {
        // Метка от прошлого экземпляра слоя (старая версия/перезагрузка) снимается;
        // шторки текущего экземпляра живут по токену, а не по хэшу клиента.
        if (marked.dataset.dshmSheetToken !== SHEET_TOKEN) {
          marked.removeAttribute('data-dshm-sheet')
          delete marked.dataset.dshmSheetToken
          marked.querySelectorAll('.dshm-sheet-close, .dshm-sheet-handle').forEach((element) => element.remove())
        }
      }
    }

    // Сворачивание ящика внизу, обычной строкой в подвале меню.
    const column = document.querySelector(':is([class$="_sidebarCol"], [class*="_sidebarCol "])')
    if (column !== null && column.querySelector('[data-dshm-collapse]') === null) {
      const collapse = document.createElement('button')
      collapse.type = 'button'
      collapse.dataset.dshmCollapse = ''
      collapse.className = 'dshm-collapse-row'
      collapse.setAttribute('aria-label', tr('Свернуть боковую панель'))
      collapse.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h10M4 17h16"/></svg><span>' + tr('Свернуть панель') + '</span>'
      collapse.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        closeDrawer()
      })
      const foot = column.querySelector('[class*="_footArea"]') ?? column.querySelector('[class*="_settingsArea"]')
      ;(foot ?? column).appendChild(collapse)
    }
  }

