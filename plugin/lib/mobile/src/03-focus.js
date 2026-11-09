  /* ── 3. ФОКУС И КЛАВИАТУРА ─────────────────────────────────────────────
   * Клиент фокусирует композер программно при открытии сессии, и на телефоне
   * это выглядит как моргнувшая клавиатура. Гасим авт фокус в самом событии
   * focusin, а терминалу xterm, наоборот, показываем клавиатуру по касанию.
   */

  /** Не давать клиенту увести фокус в поле ввода после перехода. */
  function suppressAutofocus(ms = 1800) {
    suppressTextFocusUntil = Date.now() + ms
  }

  /**
   * Гасить авт фокус поля ввода, пока открыто окно подавления.
   *
   * Клиент фокусирует композер программно при открытии сессии, и на телефоне это
   * поднимает клавиатуру. Гасим не отложенно, а в самом событии focusin: только
   * тогда клавиатура не успевает выехать. Касание самого человека по полю ввода
   * снимает окно — если он собирается печатать, мешать нечему.
   */
  function guardAutofocus() {
    document.addEventListener('focusin', (event) => {
      if (Date.now() > suppressTextFocusUntil) return
      const target = event.target
      if (isTextEntry(target)) target.blur()
    }, true)
    document.addEventListener('pointerdown', (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (target === null) return
      if (target.closest('[data-lexical-editor], [contenteditable], input, textarea')) {
        suppressTextFocusUntil = 0
      }
    }, true)
  }

  /**
   * «Плюс» и скрепка в композере вызывают `keepFocus` и программно фокусируют
   * редактор даже при закрытой клавиатуре. На Android это поднимает клавиатуру.
   * Ставим окно подавления до React-обработчика: меню откроется, а фокус не
   * успеет поднять IME.
   */
  function guardComposerMenuFocus() {
    const isTrigger = (target) => {
      if (!(target instanceof Element)) return false
      if (target.closest(':is([class$="_composerStack"], [class*="_composerStack "])') === null) return false
      return target.closest('button[class*="_add"], button[aria-label*="Добавить файлы"], button[aria-label*="выполнить команды"], button[aria-label*="Add files"], button[aria-label*="run commands"]') !== null
    }
    let restoreFocus = null
    const patchEditorFocus = () => {
      if (restoreFocus !== null) return
      const root = document.querySelector('[contenteditable="true"][data-composer-input]')
      if (root === null || document.activeElement === root) return
      const original = root.focus
      root.focus = () => {}
      restoreFocus = () => {
        if (root.isConnected && root.focus !== original) root.focus = original
        restoreFocus = null
      }
      // React обрабатывает mousedown и вызывает focus() сразу после него;
      // держим заглушку до окончания клика/открытия меню.
      window.setTimeout(() => restoreFocus?.(), 350)
    }
    const guard = (event) => {
      if (!isTrigger(event.target)) return
      patchEditorFocus()
      suppressTextFocusUntil = Date.now() + 900
    }
    const releaseOnEditor = (event) => {
      if (event.target instanceof Element && event.target.closest('[contenteditable="true"][data-composer-input]') !== null) restoreFocus?.()
    }
    document.addEventListener('pointerdown', guard, true)
    document.addEventListener('touchstart', guard, true)
    document.addEventListener('mousedown', guard, true)
    document.addEventListener('pointerdown', releaseOnEditor, true)
    // Второе нажатие на плюс должно закрывать меню, а не открывать его снова.
    document.addEventListener('click', (event) => {
      if (!isTrigger(event.target)) return
      const menu = [...document.querySelectorAll('[role=listbox], [role=menu]')]
        .find((element) => {
          const box = element.getBoundingClientRect()
          return box.width > 100 && box.height > 40
        })
      if (menu === undefined) return
      event.preventDefault()
      event.stopImmediatePropagation()
      closeClientPopover()
    }, true)
  }

  /** Клик по кнопке не оставляет клавиатуру. */
  function blurOnButtonClick() {
    document.addEventListener('click', (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[contenteditable="true"], input, textarea')) return
      // Поле поиска по сессиям открывается само и сразу получает фокус. Общее
      // правило «кнопка убирает клавиатуру» срабатывало через 180 мс после
      // нажатия на поиск: клавиатура поднималась и тут же падала, а клиент
      // успевал закрыть окно поиска. Не трогаем фокус для всей группы поиска.
      if (target.closest(':is([class$="_search"], [class*="_search "]), :is([class$="_searchButton"], [class*="_searchButton "]), :is([class$="_searchInput"], [class*="_searchInput "])')) return
      // Пока поиск раскрыт, касания внутри боковой панели — это результаты
      // или скролл списка. Снимать фокус здесь нельзя: клиент закрывает окно
      // поиска, и список схлопывается прямо во время прокрутки.
      const query = document.querySelector('input[placeholder^="Поиск"]')
      if (query !== null && query.getBoundingClientRect().width > 100
        && target.closest(':is([class$="_sidebarCol"], [class*="_sidebarCol "])') !== null) return
      // Кнопки композера и меню «плюс» не должны снимать фокус: иначе
      // клавиатура моргает при каждом открытии/закрытии поповера.
      if (target.closest('[class*="_composerStack"], [class*="_composer"], [data-dshm-tool], [data-dshm-action], .dshm-tool, .dshm-dock-toggle, [aria-label*="Добавить файлы"], [aria-label*="выполнить команды"], [aria-label*="Add files"], [aria-label*="commands"]')) return
      // Крестик очистки, наоборот, должен убрать клавиатуру: поиск закрыт,
      // оставшийся фокус в невидимом поле снова поднимал бы её.
      if (target.closest(':is([class$="_clearButton"], [class*="_clearButton "])')) {
        scheduleBlur([0, 180])
        return
      }
      // Касание терминала — тоже click по div, и общее «клик убирает клавиатуру»
      // снимало фокус с xterm сразу после того, как он его получил: клавиатура
      // закрывалась через 180 мс (проверено: activeElement пуст, innerHeight 800).
      if (target.closest('.xterm, [data-sidebar-terminal]')) return
      scheduleBlur([180, 600])
    }, true)
  }

  /**
   * Открыть клавиатуру при касании терминала.
   *
   * xterm.js фокусирует свой скрытый textarea вне жеста касания, и Android-WebView
   * клавиатуру в этом случае не показывает, а наше «клик убирает клавиатуру» ещё и
   * снимало фокус. Слушатель один на документ (касание в терминале бывает редко):
   * раньше проверка `document.querySelectorAll('.xterm')` шла каждые 800 мс, и на
   * наборе текста это давало кадр 33 мс вместо 9. Фокус ставим с задержкой 80 мс и
   * повторяем в 300 мс, если xterm успел его снять, и просим мост показать клавиатуру.
   */
  function installTerminalKeyboard() {
    document.addEventListener('pointerdown', (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const terminal = target.closest('.xterm')
      if (terminal === null) return
      const input = terminal.querySelector('textarea')
      if (input === null) return
      const showKeyboard = () => {
        input.focus()
        invokeBridge('keyboard.show', 'keyboard.show', {}, true)
      }
      setTimeout(showKeyboard, 80)
      setTimeout(() => {
        if (document.activeElement !== input) showKeyboard()
      }, 300)
    }, { capture: true })
  }

