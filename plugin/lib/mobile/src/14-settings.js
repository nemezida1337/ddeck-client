  /* ── 10b. НАСТРОЙКИ НА ТЕЛЕФОНЕ ────────────────────────────────────────
   * Настройки — портал поверх страницы; нижний док сессии под ними не должен
   * просвечивать. Класс на <html> включает мобильную компоновку настроек и
   * скрывает док, пока модалка открыта.
   */
  function watchSettingsModal() {
    const apply = () => {
      const open = [...document.querySelectorAll('[data-shortcut-modal="settings"]')]
        .some((element) => visible(element))
      if (open) {
        document.documentElement.setAttribute('data-dshm-settings-open', '')
        // DSH's own 0.2.2 CSS wins over our stylesheet for the settings nav
        // (display:grid). Apply the mobile one-row layout inline.
        for (const modal of document.querySelectorAll('[data-shortcut-modal="settings"]')) {
          const list = modal.querySelector('[class*="_navList"]')
          if (list !== null) {
            list.style.setProperty('display', 'grid', 'important')
            list.style.setProperty('grid-template-columns', 'repeat(2, minmax(0, 1fr))', 'important')
            list.style.setProperty('gap', '8px', 'important')
            const cells = [...list.querySelectorAll('[class*="_navCell"]')]
            for (const cell of cells) {
              cell.style.setProperty('width', '100%', 'important')
              cell.style.setProperty('min-width', '0', 'important')
              cell.style.setProperty('min-height', '44px', 'important')
              cell.style.setProperty('white-space', 'normal', 'important')
            }
            cells.at(-1)?.style.setProperty('grid-column', '1 / -1', 'important')
          }
        }
        // Desktop keyboard shortcuts are meaningless on a phone.
        for (const setting of document.querySelectorAll('[data-shortcut-modal="settings"] [class*="_setting"]')) {
          if (/Сочетания клавиш|Keyboard shortcuts|键盘快捷键/u.test(setting.innerText || '')) {
            setting.setAttribute('data-dshm-shortcuts', '')
          }
        }
        // Mobile header: the desktop header is hidden by CSS; keep a real close
        // button wired to the dialog's own close control.
        for (const modal of document.querySelectorAll('[data-shortcut-modal="settings"]')) {
          if (!visible(modal) || modal.querySelector('.dshm-settings-close') !== null) continue
          const original = modal.querySelector('[class*="_close"]')
          if (original === null) continue
          const close = document.createElement('button')
          close.className = 'dshm-settings-close'
          close.type = 'button'
          close.setAttribute('aria-label', tr('Закрыть'))
          close.textContent = '×'
          close.addEventListener('click', (event) => {
            event.preventDefault()
            original.click()
          })
          modal.appendChild(close)
        }
      } else {
        document.documentElement.removeAttribute('data-dshm-settings-open')
        for (const close of document.querySelectorAll('.dshm-settings-close')) close.remove()
      }
    }
    apply()
    let settingsApplyQueued = false
    new MutationObserver(() => {
      if (settingsApplyQueued) return
      settingsApplyQueued = true
      window.requestAnimationFrame(() => {
        settingsApplyQueued = false
        apply()
      })
    }).observe(document.body, { childList: true, subtree: true })
    // Switching sections should start at the top of the new section, not at the
    // scroll offset left by the previous one.
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (target === null || target.closest('[data-shortcut-modal="settings"] [class*="_navCell"]') === null) return
      for (const delay of [40, 120, 320]) {
        window.setTimeout(() => {
          const options = document.querySelector('[data-shortcut-modal="settings"] [class*="_options"]')
          if (options !== null) options.scrollTop = 0
        }, delay)
      }
    }, true)
  }

