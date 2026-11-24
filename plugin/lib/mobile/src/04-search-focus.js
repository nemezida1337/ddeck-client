  /* ── 3b. НЕ АВТОФОКУСИТЬ ПОИСК ──────────────────────────────────────────
   * Клиент при раскрытии поиска ставит фокус в поле, из-за чего клавиатура
   * выезжает в середине анимации и вызывает заметный лаг. Поле должно
   * раскрыться без клавиатуры; человек сам коснётся его, когда захочет печатать.
   */
  let searchFocusGuardUntil = 0


  /**
   * Поднять раскрытый слот поиска над шапкой немедленно.
   *
   * rc.5 кладёт раскрытое поле в ту же сетку, что строку бренда: до применения
   * оверлея касание по полю попадает в логотип и поиск схлопывается. Ждать
   * 800-мс тикер нельзя, поэтому класс ставится прямо в обработчике нажатия.
   */
  function liftSearchSlot() {
    const slot = document.querySelector('[class*="_searchSlotExpanded"]')
    if (slot === null) return
    if (!slot.classList.contains('dshm-search-lifted')) slot.classList.add('dshm-search-lifted')
  }

  function installSearchFocusGuard() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (target === null) return
      if (target.closest(':is([class$="_searchButton"], [class*="_searchButton "]), [data-dshm-action="search"]') === null) return
      searchFocusGuardUntil = Date.now() + 900
      // Раскрытое поле в rc.5 лежит под шапкой, пока мы не поднимем его
      // оверлеем; состояние поиска должно появиться раньше касания по полю.
      // Раскрытие идёт анимацией: пробуем поднять слот, пока он не появится,
      // а не один раз — иначе первое касание по полю успевает попасть в логотип.
      for (const delay of [0, 40, 80, 120, 200, 300, 450, 600, 900, 1200]) {
        window.setTimeout(() => { liftSearchSlot(); syncOverlayVisibility() }, delay)
      }
      window.setTimeout(() => {
        if (Date.now() < searchFocusGuardUntil) document.activeElement?.blur()
      }, 30)
      window.setTimeout(() => {
        if (Date.now() < searchFocusGuardUntil) document.activeElement?.blur()
      }, 180)
    }, true)
    document.addEventListener('pointerdown', (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (target === null) return
      if (target.closest('input[placeholder^="Поиск"]') !== null) searchFocusGuardUntil = 0
    }, true)
    document.addEventListener('focusin', (event) => {
      if (Date.now() > searchFocusGuardUntil) return
      const target = event.target
      if (target instanceof HTMLInputElement && target.placeholder === 'Поиск сессий') target.blur()
    }, true)
    // Поиск открывается анимацией, а состояние «поиск открыт» раньше выставлял
    // только 800-мс тикер: нижняя панель успевала мигнуть поверх результатов.
    // События фокуса редкие, поэтому пересчитываем видимость сразу по ним.
    for (const type of ['focusin', 'focusout']) {
      document.addEventListener(type, () => { window.setTimeout(syncOverlayVisibility, 0) }, true)
    }
  }

