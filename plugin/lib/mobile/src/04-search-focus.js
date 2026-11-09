  /* ── 3b. НЕ АВТОФОКУСИТЬ ПОИСК ──────────────────────────────────────────
   * Клиент при раскрытии поиска ставит фокус в поле, из-за чего клавиатура
   * выезжает в середине анимации и вызывает заметный лаг. Поле должно
   * раскрыться без клавиатуры; человек сам коснётся его, когда захочет печатать.
   */
  let searchFocusGuardUntil = 0

  function installSearchFocusGuard() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (target === null) return
      if (target.closest(':is([class$="_searchButton"], [class*="_searchButton "]), [data-dshm-action="search"]') === null) return
      searchFocusGuardUntil = Date.now() + 900
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
  }

