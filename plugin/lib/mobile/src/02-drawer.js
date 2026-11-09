  /* ── 2. БОКОВАЯ ПАНЕЛЬ И ВЫБОР СТРОКИ СЕССИИ ─────────────────────────────
   * На телефоне панель клиента заменена нашим выдвижным ящиком: клиентская
   * колонка сдвинута за край, но её дерево остаётся в DOM — список сессий,
   * группы и отметки рисует клиент. Первый тап по строке выбирает её и
   * показывает действия, второй — открывает диалог.
   */

  /**
   * Закрыть панель, не дёргая родную кнопку клиента.
   *
   * `setDrawer(false)` кликает по кнопке сворачивания внутри колонки — и этот клик
   * сбивает переход, который человек только что выбрал: экран «Плагины» не открывался.
   * Здесь только наш слой: атрибут и затенение.
   */
  function closeDrawerLight() {
    window.clearTimeout(drawerRetryTimer)
    if (!drawerOpen) return
    // DSH 0.2.2's native drawer owns the real open state. Clearing only our
    // attribute left the visible drawer open (mask, back, collapse button).
    if (nativeSidebarOpen()) setNativeSidebar(false)
    drawerOpen = false
    document.documentElement.removeAttribute('data-dshm-drawer')
    if (scrim !== null) scrim.setAttribute('aria-hidden', 'true')
    // Вернуть правую панель/вкладки, которые прятали под ящиком.
    for (const element of document.querySelectorAll('[data-dshm-under-drawer]')) element.removeAttribute('data-dshm-under-drawer')
    scheduleBlur([120, 400, 900])
  }

  /** DSH 0.2.2's native responsive drawer. */
  function nativeSidebarDialog() {
    return document.querySelector('[role=dialog][data-shortcut-modal="sidebar"]')
  }

  function nativeSidebarOpen() {
    const dialog = nativeSidebarDialog()
    return dialog !== null && visible(dialog) && rect(dialog).x >= 0
  }

  function setNativeSidebar(open) {
    const dialog = nativeSidebarDialog()
    if (dialog === null) return false
    if (nativeSidebarOpen() === open) return true
    if (open) {
      const opener = document.querySelector('[data-sidebar-opener]')
      if (opener === null) return false
      opener.click()
      return true
    }
    const mask = document.querySelector('[class*="drawerMask"]')
    if (mask !== null) { mask.click(); return true }
    const close = [...document.querySelectorAll('[aria-label="Свернуть боковую панель"]')]
      .find((button) => visible(button))
    if (close === undefined) return false
    suppressPanelCollapseUntil = Date.now() + 800
    close.click()
    return true
  }

  // Native drawer state can change without our setDrawer (mask, back gesture,
  // DSH restoring desktop sidebar). Keep the compatibility attribute truthful.
  window.setInterval(() => {
    if (paused()) return
    const dialog = document.querySelector('[role=dialog][data-shortcut-modal="sidebar"]')
    if (dialog === null) return
    const open = visible(dialog) && rect(dialog).x >= 0
    drawerOpen = open
    if (open) {
      ensureBottomSidebarNav()
      ensureDrawerGuard()
      for (const element of dialog.querySelectorAll('*')) {
        if (element.dataset.dshmBottomPad === '1') continue
        const style = getComputedStyle(element)
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll')
          && element.scrollHeight > element.clientHeight + 10) {
          element.style.setProperty('padding-bottom', 'calc(84px + env(safe-area-inset-bottom, 0px))', 'important')
          element.dataset.dshmBottomPad = '1'
        }
      }
    }
    if (open !== document.documentElement.hasAttribute('data-dshm-drawer')) {
      document.documentElement.toggleAttribute('data-dshm-drawer', open)
    }
  }, 250)

  function setDrawer(open) {
    if (nativeSidebarDialog() !== null) {
      if (!setNativeSidebar(open)) return
      drawerOpen = open
      document.documentElement.toggleAttribute('data-dshm-drawer', open)
      if (open) {
        ensureBottomSidebarNav()
        ensureDrawerGuard()
      }
      return
    }
    // Пустой ящик не должен появляться никогда: если дерево клиента не нарисовано,
    // просим клиент нарисовать его до показа.
    if (open) {
      keepClientPanelOpen()
      // Пустой ящик — это «мёртвое» меню: клиент ещё не отрисовал дерево
      // (переход/перезагрузка). Не показываем его; пробуем ещё раз чуть позже.
      if (!hasSidebarContent()) {
        window.clearTimeout(drawerRetryTimer)
        drawerRetryTimer = window.setTimeout(() => {
          if (!drawerOpen && hasSidebarContent()) setDrawer(true)
        }, 300)
        return
      }
      // Левое меню — единственный видимый слой: правую панель/вкладки/журнал и
      // шторки прячем (не закрывая, чтобы не терять состояние), иначе интерфейс
      // выглядит «слоёным». После закрытия меню они возвращаются как были.
      if (typeof closeToolSheet === 'function') closeToolSheet()
      if (document.querySelector('.dshm-grid') !== null) closeToolGrid()
      for (const element of document.querySelectorAll('[class*="tabHost"], [data-sidebar-right-panel]')) {
        element.dataset.dshmUnderDrawer = '1'
      }
    }
    // Открывая панель, убираем фокус из поля ввода.
    //
    // Иначе клавиатура остаётся поднятой и накрывает панель: человек набрал текст,
    // открыл меню — и вместо списка сессий видит половину экрана. Проверено: высота
    // страницы падала с 800 до 421, фокус оставался в редакторе.
    if (open && document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (open === drawerOpen) {
      if (open) document.documentElement.setAttribute('data-dshm-drawer', '')
      else document.documentElement.removeAttribute('data-dshm-drawer')
      return
    }
    // Родную кнопку больше не нажимаем: панель клиента держится открытой постоянно
    // (см. keepClientPanelOpen), а её переключение на каждое открытие заставляло клиент
    // заново строить дерево — замер показал кадр 175 мс и 257 мс длинных задач.
    // Наш drawer — только CSS-состояние.
    drawerOpen = open
    if (open) {
      drawerOpenedAt = Date.now()
      document.documentElement.setAttribute('data-dshm-drawer', '')
      // Не ждём медленного тика: верхние строки и нижняя навигация должны быть
      // приведены к мобильному виду сразу при открытии панели.
      ensureBottomSidebarNav()
    }
    else document.documentElement.removeAttribute('data-dshm-drawer')
    if (!open) {
      for (const element of document.querySelectorAll('[data-dshm-under-drawer]')) element.removeAttribute('data-dshm-under-drawer')
    }
    if (scrim !== null) scrim.setAttribute('aria-hidden', open ? 'false' : 'true')
    // Закрытие панели тоже не должно поднимать клавиатуру: человек убрал меню, а не
    // собрался печатать. Проверено: после закрытия высота падала до 421.
    if (!open) scheduleBlur([120, 400, 900], true)
  }

  function closeDrawer() {
    setDrawer(false)
  }

  /** Снять выбор со строки сессии. */
  function clearPickedRow() {
    if (pickedRow === null) return
    pickedRow.removeAttribute('data-dshm-picked')
    pickedRow = null
  }

  /**
   * Выбрать строку сессии первым касанием.
   *
   * @param {Element} row строка сессии ([role=treeitem] без aria-expanded).
   */
  function pickRow(row) {
    clearPickedRow()
    pickedRow = row
    row.setAttribute('data-dshm-picked', '')
  }

  /**
   * Двухшаговый выбор сессии: первый тап показывает действия, второй открывает.
   *
   * Перехват идёт в фазе до React: событие, которое должно только выбрать
   * строку, до клиента не доходит и диалог не открывается. Второй тап свободно
   * проходит дальше — клиент открывает сессию, а наш обычный обработчик
   * перехода закрывает меню.
   */

  /**
   * Кнопка «Свернуть боковую панель» внутри панели клиента закрывает наш ящик.
   *
   * Клиент по этой кнопке прячет собственную панель. На телефоне это значит, что
   * дерево сессий исчезает, а наш ящик остаётся и выглядит пустым — человек
   * видит «другую пустую панель» при следующем открытии. Поэтому касание
   * перехватываем до клиента и закрываем то, что действительно открыто.
   */
  function bindPanelCollapse() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null
      if (target === null) return
      if (Date.now() < suppressPanelCollapseUntil) return
      if (!/^(Свернуть боковую панель|Collapse sidebar|收起侧边栏)$/u.test((target.getAttribute('aria-label') || '').trim())) return
      event.preventDefault()
      event.stopPropagation()
      closeDrawerLight()
    }, true)
  }

  function bindSessionPicking() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (target === null) return
      if (Date.now() < bypassPickedUntil) {
        clearPickedRow()
        return
      }
      const row = target.closest('[role=treeitem]')
      if (row === null || row.getAttribute('aria-expanded') !== null) {
        clearPickedRow()
        return
      }
      // Двухшаговый выбор — только для настоящих строк сессий (`data-row-key`
      // начинается с `session:`). Остальные treeitem'ы (результаты поиска,
      // строки субагентов в правой панели) не должны перехватываться: иначе
      // первый тап по стрелке «открыть на боковой панели» уходил в выбор строки,
      // а не в кнопку, и требовался второй тап.
      const rowKey = row.getAttribute('data-row-key') ?? ''
      if (!rowKey.startsWith('session:')) {
        clearPickedRow()
        return
      }
      // Кнопки действий живут внутри выбранной строки: меню открывает клиент,
      // но это действие над строкой, а не переход — панель закрывать нельзя.
      // Ради этого касания обычный обработчик перехода на мгновение глушится.
      if (target.closest(':is([class$="_rowActions"], [class*="_rowActions "])') !== null) {
        suppressCloseUntil = Date.now() + 400
        return
      }
      if (row.hasAttribute('data-dshm-picked')) {
        clearPickedRow()
        return
      }
      event.preventDefault()
      event.stopPropagation()
      pickRow(row)
    }, true)
  }

  /** Когда последний раз пытались вернуть панель клиента, мс. */
  let lastPanelOpenTry = 0

  /**
   * Держать дерево клиента отрисованным.
   *
   * Панель клиента на телефоне заменена нашим слоем: она сдвинута за край, но её
   * содержимое должно существовать в DOM, потому что список сессий, группы и
   * отметки рисует именно клиент. Клиент умеет её закрыть (кнопка «Свернуть
   * боковую панель», восстановление состояния после сворачивания приложения), и
   * тогда наш выдвижной ящик открывается пустым — ровно то, что человек видит
   * как «какая-то совсем другая пустая панель».
   *
   * Поэтому проверка повторяется, а не срабатывает один раз: если дерева нет и
   * есть кнопка «Открыть боковую панель», нажимаем её (сама панель остаётся за
   * краем — её показывает только наш ящик). Не чаще раза в две секунды, чтобы не
   * драться с человеком за состояние.
   */
  function keepClientPanelOpen() {
    const hasTree = document.querySelector(':is([class$="_list"], [class*="_list "]) [role=treeitem]') !== null
    if (hasTree) return
    const toggle = findButton(/Открыть боковую панель|Open sidebar|打开侧边栏/iu)
    if (toggle === undefined) return
    if (Date.now() - lastPanelOpenTry < 2000) return
    lastPanelOpenTry = Date.now()
    suppressCloseUntil = Date.now() + 500
    toggle.click()
  }

  /** Спрятать строку статистики под композером. */

  /** Создать кнопку меню и затенение под панелью один раз. */
  function build() {
    if (menu === null) {
      menu = document.createElement('button')
      menu.type = 'button'
      menu.className = 'dshm-menu'
      menu.setAttribute('aria-label', tr('Меню'))
      menu.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
      menu.addEventListener('click', () => { setDrawer(true) })
    }
    if (pageScrim === null) {
      pageScrim = document.createElement('div')
      pageScrim.className = 'dshm-page-scrim'
      pageScrim.setAttribute('aria-hidden', 'true')
    }
    if (pageScrim.parentElement !== document.body) document.body.appendChild(pageScrim)
    if (scrim === null) {
      scrim = document.createElement('button')
      scrim.type = 'button'
      scrim.className = 'dshm-scrim'
      scrim.setAttribute('aria-label', tr('Закрыть меню'))
      scrim.setAttribute('aria-hidden', 'true')
      scrim.addEventListener('click', closeDrawer)
    }
    // Оба узла живут на body: панель, из которой открывается меню, уезжает за край.
    if (menu.parentElement !== document.body) {
      document.body.appendChild(scrim)
      document.body.appendChild(menu)
    }
  }

