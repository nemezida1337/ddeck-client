  /* ── 4. НАВИГАЦИЯ И СИСТЕМНАЯ «НАЗАД» ───────────────────────────────────
   * Приложение шлёт странице cancelable-событие dsh-mobile:native-back и
   * уходит только если никто не позвал preventDefault. Порядок закрытия:
   * наша панель Remote, поповер клиента, правая панель, модальное окно,
   * диалог, детальный экран, вторичная страница, боковое меню. В самом
   * диалоге «назад» открывает меню — привычный жест.
   */

  /**
   * Вернуться из вторичного экрана в диалог и открыть меню.
   *
   * «Назад» на телефоне возвращает туда, откуда пришли: человек открыл «Плагины»
   * из бокового меню — назад ждёт то же меню, а не выход из приложения. Клиент не
   * использует history API (замер: history.length = 1 на любой странице), поэтому
   * переход делается нажатием на строку текущей сессии — тот же путь, которым он
   * ходит в диалог сам.
   *
   * @returns {boolean} удалось ли вернуться (false — строки текущей сессии нет).
   */
  function returnToChat() {
    let current = ''
    try { current = JSON.parse(localStorage.getItem('dsh.sessions.current') || '{}').sessionId || '' } catch {}
    /** Найти строку текущей сессии среди отрисованных. */
    const findRow = () => document.querySelector(`[role=treeitem][data-row-key="session:${current}"]`)
    /**
     * Перейти в переписку нажатием строки — тем же путём, которым ходит клиент.
     *
     * @param {Element} row строка текущей сессии.
     * @returns {boolean} всегда true: жест обработан.
     */
    const go = (row) => {
      suppressAutofocus()
      suppressCloseUntil = Date.now() + 1500
      // Меню открываем ДО перехода: клиент рисует переписку около секунды и
      // блокирует главный поток, а выезд панели идёт на композиторе. Открытая
      // сразу панель — это немедленный отклик на «назад»; иначе человек секунду
      // смотрит на замерший экран и только потом видит анимацию. Замер до правки:
      // переход в переписку 1073 мс, меню 1265 мс после нажатия.
      setDrawer(true)
      bypassPickedUntil = Date.now() + 200
      row.click()
      // Страховка: если клиент всё-таки сбросит состояние, вернуть меню.
      setTimeout(() => { if (!paused() && !drawerOpen) setDrawer(true) }, 700)
      return true
    }
    const row = findRow()
    if (row !== null) return go(row)
    // Строка не отрисована: текущая сессия может лежать в свёрнутой рабочей
    // области или за «Показать ещё». Раскрываем группы и пробуем снова — без
    // этого «назад» со вторичного экрана оставлял человека на «Плагины» с
    // открытым меню (проверено: текущая сессия в свёрнутой области).
    const collapsed = [...document.querySelectorAll('[role=treeitem][aria-expanded="false"]')]
    if (collapsed.length > 0) {
      setDrawer(true)
      suppressCloseUntil = Date.now() + 1500
      for (const group of collapsed) group.click()
      setTimeout(() => {
        if (paused()) return
        const late = findRow()
        if (late !== null) go(late)
      }, 350)
      return true
    }
    // Строки нет совсем (например, сессия скрыта фильтром): остаёмся в меню,
    // чтобы человек выбрал чат сам, и не даём оболочке закрыть приложение.
    setDrawer(true)
    return true
  }

  /**
   * Видимое модальное окно клиента (настройки и подобные).
   *
   * @returns {Element|undefined} окно или undefined, если модалок на экране нет.
   */
  function visibleClientModal() {
    return [...document.querySelectorAll('[data-shortcut-modal]')].find((element) => visible(element))
  }

  /** Закрыть модальное окно клиента — кнопкой, которую он сам рисует. */
  function closeClientModal() {
    const modal = visibleClientModal()
    if (modal === undefined) return false
    // Две схемы имён: client-модули дают `_hash_close`, примитивы — `_close_hash_line`.
    const close = modal.querySelector('[class*="_close"]')
      ?? findButton(/^(Закрыть|Close|关闭)$/u, modal)
    if (close === null || close === undefined) return false
    close.click()
    return true
  }

  /**
   * Закрыть диалог клиента, у которого нет своей кнопки закрытия-крестика.
   *
   * Диалоги вроде «Переименовать сессию» объявляют `role="dialog"` и закрываются
   * кнопкой «Отмена». Без этого «назад» закрывал боковое меню под диалогом, а сам
   * диалог оставался висеть поверх диалога — и следующее нажатие снова открывало
   * меню. Настройки сюда не попадают: у них `data-shortcut-modal` и свой крестик,
   * их закрывает [closeClientModal].
   *
   * @returns {boolean} закрыли ли диалог.
   */
  function closeClientDialog() {
    const dialogs = [...document.querySelectorAll('[role=dialog]')].filter((element) => {
      if (element.id === 'dshm-remote-panel') return false
      if (element.hasAttribute('data-shortcut-modal')) return false
      return visible(element)
    })
    // Диалоги накладываются друг на друга (статистика, токены, контекст, команда
    // агентов открываются из панели и не закрываются сами): «назад» должен снять
    // верхний, а не искать первый в DOM.
    const dialog = dialogs[dialogs.length - 1]
    if (dialog === undefined) return false
    const cancel = findButton(/^(Отмена|Cancel|Закрыть|Close|取消|关闭)$/u, dialog, { text: true })
    if (cancel !== undefined) {
      cancel.click()
      return true
    }
    const close = dialog.querySelector('[class*="_close"], button[aria-label*="Закрыть"], button[aria-label*="Close"], button[aria-label*="关闭"]')
    if (close !== null) {
      close.click()
      return true
    }
    // У панелей статистики нет своей кнопки: клиент закрывает их по Escape.
    // Событие уходит в документ, поэтому страница ведёт себя как от нажатия Esc.
    dialog.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true,
    }))
    return true
  }

  /**
   * Вернуться из детального экрана в его список.
   *
   * У страницы плагина/задачи есть своя кнопка-крошка «К списку плагинов»; системная
   * «назад» до неё не доходит и без этого открывала боковое меню поверх деталей.
   *
   * @returns {boolean} был ли детальный экран.
   */
  function closeClientDetail() {
    const back = buttons().find((element) => {
      if (!visible(element)) return false
      const label = (element.getAttribute('aria-label') || element.innerText || '').trim()
      // Детали автозадачи закрываются кнопкой «Закрыть подробности», у плагина —
      // крошкой «К списку …».
      return /^(К списку|Back to |Закрыть подробности|Close details|返回|关闭详情)/u.test(label)
    })
    if (back === undefined) return false
    back.click()
    return true
  }

  /**
   * Вторичный экран клиента: плагины, автоматические задачи и подобные страницы.
   *
   * Своего признака маршрута у них нет (адрес остаётся /m), но есть заголовок
   * страницы — его рисуют только такие экраны. У чата заголовка страницы нет.
   */
  function onSecondaryScreen() {
    for (const selector of [':is([class$="_pageTitle"], [class*="_pageTitle "])', ':is([class$="_pageHeading"], [class*="_pageHeading "])']) {
      const element = document.querySelector(selector)
      if (element !== null && rect(element).width > 0) return true
    }
    return false
  }

  /**
   * Закрыть открытый поповер клиента — меню команд, выбора модели и подобные.
   *
   * Системная «назад» до поповеров клиента не доходит: он закрывает их касанием
   * в любом другом месте страницы. Без этого «назад» с открытым меню композера
   * открывал поверх него боковое меню приложения. Шлём pointerdown в шапку —
   * безопасную точку: своего обработчика у неё нет, а меню закрывается.
   *
   * @returns {boolean} был ли открыт поповер.
   */
  function closeClientPopover() {
    const popover = [...document.querySelectorAll('[role=menu],[role=listbox]')]
      .find((element) => {
        // Меню/списки внутри модалки настроек — часть модалки, а не отдельный
        // поповер. Иначе «назад» закрывал невидимый role=menu и оставлял
        // настройки висеть.
        if (element.closest('[data-shortcut-modal]') !== null) return false
        const box = rect(element)
        return visible(element) && box.x < window.innerWidth && box.right > 0
      })
    if (popover === undefined) return false
    const neutral = document.querySelector('header') ?? document.body
    neutral.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
      clientX: 180,
      clientY: 60,
    }))
    return true
  }

  /**
   * Закрыть правую панель, если она открыта на экране.
   *
   * Панель открывается тапом по файлу/вкладке и накрывает диалог; на телефоне у
   * неё нет привычного места, а системная «назад» должна возвращать в диалог, а
   * не открывать боковое меню поверх панели.
   *
   * @returns {boolean} была ли панель открыта и закрыта.
   */
  function closeRightPanel() {
    const toggle = [...document.querySelectorAll('[data-sidebar-right-toggle]')]
      // Только та, что действительно на экране: кнопка существует и когда панель
      // разложена, но лежит за правым краем (x ≈ 670 при экране 360).
      .find((element) => onScreen(element))
    if (toggle === undefined) return false
    toggle.click()
    return true
  }

  /**
   * Закрыть правую панель, если в ней не осталось ни одной вкладки.
   *
   * Проверено: после закрытия последней вкладки (терминал) клиент оставляет панель
   * открытой пустой — ни гида «Начало», ни вкладок, только полноэкранная пустота
   * поверх чата. Новый гид клиент сам не сеет (и после перезагрузки тоже). Пустую
   * панель закрываем: человек возвращается в чат, а нужную поверхность открывает
   * обычной карточкой входа.
   */
  function closeEmptyRightPanel() {
    const toggle = [...document.querySelectorAll('[data-sidebar-right-toggle]')]
      .find((element) => onScreen(element, false))
    if (toggle === undefined) return
    if (document.querySelectorAll('[data-dockkit-tab]').length > 0) return
    const panel = document.querySelector('[data-sidebar-right-panel]')
    if (panel === null) return
    if ((panel.innerText || '').trim() !== '') return
    closeRightPanel()
  }

  /**
   * Горизонтальная лента вкладок настроек должна доскролливаться до выбранной
   * вкладки. На узком экране «Пресеты агента» и «Встроенные» находятся за краем.
   */
  function bindSettingsTabsScroll() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null
      const cell = target?.closest('[class*="_navCell"]')
      if (cell === null || cell === undefined) return
      window.setTimeout(() => {
        const active = [...document.querySelectorAll('[class*="_navCell"][class*="_active"]')]
          .find((element) => element.getBoundingClientRect().width > 0)
        if (active === undefined) return
        active.scrollIntoView({ block: 'nearest', inline: 'center' })
      }, 30)
    }, true)
  }

  /**
   * На телефоне одно касание строки сессии должно открывать сессию.
   *
   * Клиент на настольном hover сначала показывает действия строки, и первое
   * касание только выделяет строку. Второе открывает её. На телефоне это
   * выглядит как «кнопка не работает». Для обычного тапа (без скролла и без
   * нажатия на action-кнопки) повторяем клик программно.
   */
  function bindSessionRowTap() {
    let start = null
    let suppressUntil = 0
    document.addEventListener('click', (event) => {
      if (Date.now() > suppressUntil) return
      if (event.target instanceof Element && event.target.closest('[role=treeitem]') !== null) {
        event.preventDefault()
        event.stopPropagation()
      }
    }, true)
    document.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch') return
      const target = event.target instanceof Element ? event.target : null
      if (target === null) return
      const row = target.closest('[role=treeitem]')
      if (row === null || !String(row.className).includes('sessionRow')) return
      if (target.closest('button, [role=button], a') !== null) return
      const state = { x: event.clientX, y: event.clientY, row, long: false, moved: false, timer: 0 }
      state.timer = window.setTimeout(() => {
        state.long = true
        // Долгое нажатие — это действия строки (закрепить/архивировать).
        state.row.click()
        suppressUntil = Date.now() + 800
      }, 450)
      start = state
    }, true)
    document.addEventListener('pointermove', (event) => {
      if (start === null || start.moved) return
      if (Math.abs(event.clientX - start.x) <= 10 && Math.abs(event.clientY - start.y) <= 10) return
      start.moved = true
      window.clearTimeout(start.timer)
      suppressUntil = Date.now() + 500
    }, true)
    document.addEventListener('pointercancel', () => {
      if (start === null) return
      window.clearTimeout(start.timer)
      start = null
      suppressUntil = Date.now() + 500
    }, true)
    document.addEventListener('pointerup', (event) => {
      if (start === null) return
      const current = start
      start = null
      window.clearTimeout(current.timer)
      if (current.long) return
      if (current.row !== document.body && !current.row.isConnected) return
      if (current.moved || Math.abs(event.clientX - current.x) > 8 || Math.abs(event.clientY - current.y) > 8) {
        // Это скролл списка, а не касание строки. Браузер может прислать click
        // после окончания жеста; не даём ему открыть сессию.
        suppressUntil = Date.now() + 350
        return
      }
      // Первый клиентский click выделяет строку и показывает действия; второй
      // уже открывает сессию.
      current.row.click()
      window.setTimeout(() => {
        if (current.row.isConnected) current.row.click()
      }, 20)
    }, true)
  }

  /**
   * На вторичных страницах контент прокручивается под статус-бар и кнопку меню.
   * Пока страница прокручена, закрываем верхний край мягким скримом.
   */


  /**
   * Системная кнопка «назад».
   *
   * Приложение не закрывает экран само: оно шлёт странице cancelable-событие
   * `dsh-mobile:native-back` и уходит только если никто не позвал preventDefault.
   * Мой слой это событие не слушал — и «назад» оставлял панель открытой вместе со
   * списком сессий (проверено: после нажатия drawer оставался true).
   */
  function bindBackButton() {
    window.addEventListener('dsh-mobile:native-back', (event) => {
      // Settings is a full-screen modal. Close it explicitly before any
      // popover/right-panel heuristics: 0.2.2's settings contains role=menu
      // navigation, which used to swallow the back gesture.
      const settings = [...document.querySelectorAll('[data-shortcut-modal="settings"]')]
        .find((element) => visible(element))
      if (settings !== undefined) {
        const close = settings.querySelector('[class*="_close"]')
          ?? [...settings.querySelectorAll('button')].find((button) => /^(Закрыть|Close|关闭)$/u.test((button.innerText || '').trim()))
        if (close !== null && close !== undefined) {
          close.click()
          event.preventDefault()
          return
        }
      }
      const moreMenu = document.querySelector('.dshm-more-menu')
      if (moreMenu !== null) {
        document.querySelector('.dshm-more-scrim')?.click()
        moreMenu.remove()
        event.preventDefault()
        return
      }
      const onboarding = document.querySelector('.dshm-onboard')
      if (onboarding !== null) {
        onboarding.querySelector('.dshm-onboard-skip')?.click()
        event.preventDefault()
        return
      }
      const panel = document.getElementById('dshm-remote-panel')
      if (panel !== null && getComputedStyle(panel).display !== 'none') {
        const scrim = document.getElementById('dshm-remote-scrim')
        if (scrim !== null) scrim.click()
        event.preventDefault()
        return
      }
      // Сетка инструментов закрывается раньше всего.
      if (document.querySelector('.dshm-grid') !== null) {
        closeToolGrid()
        event.preventDefault()
        return
      }
      // Поповер клиента (меню команд, выбор модели) закрывается первым: он
      // висит поверх содержимого и поверх правой панели.
      if (closeClientPopover()) {
        event.preventDefault()
        return
      }
      // Правая панель (файлы) закрывается следующей: она накрывает диалог.
      if (closeRightPanel()) {
        event.preventDefault()
        return
      }
      // Модальное окно клиента (настройки и подобные) закрывается своей кнопкой.
      if (closeClientModal()) {
        event.preventDefault()
        return
      }
      // Обычный диалог клиента («Переименовать сессию» и подобные) — кнопкой «Отмена».
      if (closeClientDialog()) {
        event.preventDefault()
        return
      }
      // Детальный экран (плагин, задача) возвращается сначала в свой список.
      if (closeClientDetail()) {
        event.preventDefault()
        return
      }
      // С вторичной страницы «назад» возвращает в диалог и открывает меню —
      // иначе человеку приходится искать кнопку меню заново.
      if (onSecondaryScreen() && returnToChat()) {
        event.preventDefault()
        return
      }
      if (document.documentElement.hasAttribute('data-dshm-drawer')) {
        closeDrawerLight()
        event.preventDefault()
        return
      }
      // В самом диалоге «назад» открывает боковое меню: это ожидаемый жест и
      // способ добраться до списка чатов, не поднимая палец к кнопке.
      setDrawer(true)
      event.preventDefault()
    })
  }

  /**
   * На телефоне в правой панели должна быть одна активная вкладка на всю ширину.
   *
   * Dockkit строит вкладки как grid: при двух открытых вкладках (гайд + разговор
   * субагента) получались две колонки по 180 px, и текст чата сжимался в полоску.
   * У клиента ширина колонок задана inline-стилем, поэтому CSS с !important
   * недостаточно надёжен — выставляем inline-important сами.
   */
  function singleColumnRightPanel() {
    if (innerWidth > 600) return
    /** Выставить inline-important только если значение реально меняется. */
    const set = (element, property, value) => {
      if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value, 'important')
    }
    for (const panel of document.querySelectorAll('[data-sidebar-right-panel]')) {
      for (const layout of panel.querySelectorAll('[class*="_tabLayout_"]')) {
        if (layout.style.getPropertyValue('grid-template-columns') !== '1fr') {
          set(layout, 'grid-template-columns', '1fr')
        }
      }
      // Одновременно «активными» могут быть несколько pane (старые вкладки
      // остаются смонтированными). Видимой должна быть только та ячейка, в
      // tab-strip которой выбран активный таб; иначе два заголовка складываются
      // друг на друга.
      const activeCells = [...panel.querySelectorAll('[class*="_tabCell_"]')]
        .filter((cell) => cell.querySelector('[data-dockkit-pane-active="true"]') !== null)
      const selected = activeCells.find((cell) => [...cell.querySelectorAll('[data-dockkit-tab]')]
        .some((tab) => String(tab.className).includes('_tabActive_')))
        ?? activeCells[activeCells.length - 1]
        ?? null
      for (const cell of panel.querySelectorAll('[class*="_tabCell_"]')) {
        const isActive = cell === selected
        set(cell, 'display', isActive ? 'block' : 'none')
        if (isActive) {
          set(cell, 'grid-area', '1 / 1 / 2 / 2')
          set(cell, 'width', '100%')
          // Cell height must stay inside the panel: otherwise _tabHostBody_
          // раскрывается на 3000+ px, панель обрезает его, а внутренний scroll
          // остаётся нулевой высоты — чат нельзя пролистать.
          set(cell, 'height', '100%')
          set(cell, 'max-height', '100%')
          set(cell, 'overflow', 'hidden')
          const host = cell.querySelector('[class*="_tabHost_"]')
          if (host !== null) {
            set(host, 'height', '100%')
            set(host, 'max-height', '100%')
            set(host, 'display', 'flex')
            set(host, 'flex-direction', 'column')
            set(host, 'overflow', 'hidden')
          }
          const hostBody = cell.querySelector('[class*="_tabHostBody_"]')
          if (hostBody !== null) {
            set(hostBody, 'flex', '1 1 auto')
            set(hostBody, 'min-height', '0')
            set(hostBody, 'height', 'auto')
            set(hostBody, 'overflow-y', 'auto')
            // Панель тянется под системную навигацию; оставляем нижний отступ,
            // чтобы композер и последние строки не уезжали под кнопки Android.
            set(hostBody, 'padding-bottom', 'calc(env(safe-area-inset-bottom) + .5rem)')
            set(hostBody, 'box-sizing', 'border-box')
          }
        }
      }
      // Разделитель между колонками на телефоне не нужен.
      for (const divider of panel.querySelectorAll('[class*="_tabLayoutDivider_"]')) {
        set(divider, 'display', 'none')
      }
    }
  }

  /**
   * Следить за правой панелью по её стабильным data-атрибутам, а не по тексту
   * aria-label: подписи переводятся, и русская проверка ломалась бы в en/zh.
   * Состояние читаем из DOM после клика: `data-sidebar-right-open` есть, пока
   * панель развёрнута.
   */
  function trackRightPanel() {
    if (document.documentElement.hasAttribute('data-dshm-right-tracked')) return
    document.documentElement.setAttribute('data-dshm-right-tracked', '')
    const sync = () => {
      rightPanelVisible = document.querySelector('[data-sidebar-right-open]') !== null
      // Правая панель на телефоне полноэкранная; плавающая кнопка меню иначе
      // накрывает её заголовок и кнопку закрытия.
      setAttrIfChanged(document.documentElement, 'data-dshm-right-open', rightPanelVisible ? '' : null)
      if (rightPanelVisible) singleColumnRightPanel()
      if (rightPanelVisible && document.documentElement.hasAttribute('data-dshm-drawer')) closeDrawerLight()
    }
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element
        ? event.target.closest('[data-sidebar-right-expand], [data-sidebar-right-toggle], [data-sidebar-right-mode], [data-sidebar-right-panel] button')
        : null
      if (target === null) return
      window.setTimeout(sync, 0)
    }, true)
    // Панель могли восстановить открытой после перезагрузки — прочитать сразу.
    window.setTimeout(sync, 300)
  }

  function closeOnNavigate() {
    const column = document.querySelector(':is([class$="_sidebarCol"], [class*="_sidebarCol "])')
    if (column === null || column.hasAttribute('data-dshm-bound')) return
    column.setAttribute('data-dshm-bound', '')
    column.addEventListener('click', (event) => {
      if (Date.now() < suppressCloseUntil) return
      const target = event.target instanceof Element ? event.target.closest('button, a, [role=treeitem]') : null
      if (target === null) return
      const label = (target.getAttribute('aria-label') || '').trim()
      if (/^(Поиск сессий|Очистить поиск|Добавить рабочую область|Настройки|Параметры вида)$/u.test(label)) return
      // Вся шапка «Рабочие области» — это управление списком, а не переход:
      // крестик поиска и шестерёнка не должны закрывать боковую панель.
      if (target.closest(':is([class$="_sectionHeader"], [class*="_sectionHeader "]), :is([class$="_searchSlot"], [class*="_searchSlot "])') !== null) return
      // «Вы вошли в DeepSeek» открывает настройки модалкой. Панель при этом не
      // должна сворачиваться: человек вернётся из настроек в ту же панель.
      if (/учётной записи|account menu|账号菜单/iu.test(label)) return
      // Внутренние действия списка не уводят с экрана: группа рабочей области
      // раскрывается/сворачивается, «Показать ещё» догружает строки — меню
      // должно остаться открытым. Раньше любое такое касание закрывало его, и
      // человек терял место, до которого листал.
      if (target.closest('[role=treeitem][aria-expanded]') !== null) return
      if (target.closest(':is([class$="_sessionOverflowButton"], [class*="_sessionOverflowButton "])') !== null) return
      // Переход в другой экран не должен поднимать клавиатуру: клиент фокусирует
      // композер при открытии сессии, и это выглядит как моргнувшая клавиатура.
      suppressAutofocus()
      setTimeout(closeDrawerLight, 120)
      scheduleBlur([300, 900, 1800])
    })
  }

  /** Закрыть боковую панель клавишей Escape — привычный жест на телефоне с клавиатурой. */
  function bindEscapeClose() {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.documentElement.hasAttribute('data-dshm-drawer')) {
        closeDrawer()
        event.preventDefault()
      }
    })
  }

