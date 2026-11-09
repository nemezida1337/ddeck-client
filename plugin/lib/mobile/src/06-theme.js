  /* ── 5. ТЕМА И РАБОЧАЯ ОБЛАСТЬ ──────────────────────────────────────────
   * Тема читается у клиента (color-scheme на <html>), а не угадывается по
   * системным цветам: они не переключаются на лету и дают чёрный текст на
   * тёмном фоне. Последняя рабочая область запоминается и предлагается одной
   * кнопкой: клиент не помнит выбор между перезагрузками.
   */

  /**
   * Тема: читаем у клиента и выставляем своей разметке.
   *
   * Клиент держит её в `color-scheme` на <html>. Системные цвета брать нельзя — они не
   * переключаются на лету, и в светлой теме получался чёрный текст на тёмном фоне.
   */
  function applyTheme() {
    // Цвет берём у клиента, а не из своих догадок: тема приложения может быть любой, и
    // единственный надёжный источник — то, что он сам нарисовал. Системные цвета не
    // годятся: они не переключаются на лету и дают чёрный текст на тёмном фоне.
    const body = getComputedStyle(document.body)
    const surface = body.backgroundColor
    const ink = body.color
    const root = document.documentElement.style
    if (surface && surface !== 'rgba(0, 0, 0, 0)' && surface !== 'transparent') {
      root.setProperty('--dshm-surface', surface)
    }
    if (ink) root.setProperty('--dshm-ink', ink)
    const scheme = String(getComputedStyle(document.documentElement).colorScheme || '')
    const theme = scheme.includes('light') ? 'light' : 'dark'
    if (document.documentElement.getAttribute('data-dshm-theme') !== theme) {
      document.documentElement.setAttribute('data-dshm-theme', theme)
      // The Android system bars are outside CSS; ask the native shell to follow
      // the page theme so light mode does not leave white icons on a white bar.
      invokeBridge('ui.bars', 'ui.bars', { light: theme === 'light' })
    }
  }

  /**
   * Последняя рабочая область — и кнопка «продолжить в ней».
   *
   * Клиент не запоминает выбор между перезагрузками (в localStorage лежит только
   * dsh.sessions.current), поэтому после каждого запуска человек заново проходит выбор
   * каталога. Слой запоминает последнюю область и предлагает её одной кнопкой: он сам
   * открывает диалог, находит строку с тем же именем и нажимает «Открыть».
   */
  const WORKSPACE_KEY = 'dsh-remote.workspace'

  function rememberedWorkspace() {
    try { return JSON.parse(localStorage.getItem(WORKSPACE_KEY) ?? 'null') } catch { return null }
  }

  function rememberWorkspace(name) {
    if (typeof name !== 'string' || name.length === 0) return
    const current = rememberedWorkspace()
    if (current !== null && current.name === name) return
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ name }))
  }

  /**
   * Запомнить область, по которой человек нажал в диалоге.
   *
   * Подпись рядом с композером читать нельзя: у кнопки пустой textContent и даже
   * innerText — видимое имя рисует вложенный элемент. Зато строка диалога, по которой
   * нажали, содержит имя прямо в тексте.
   */
  function captureWorkspaceClick() {
    document.addEventListener('click', (event) => {
      const dialog = document.querySelector('[role=dialog]')
      if (dialog === null || !/каталог|directory|workspace/i.test(dialog.innerText ?? '')) return
      const row = event.target instanceof Element ? event.target.closest('*') : null
      let node = row
      for (let depth = 0; depth < 4 && node !== null; depth += 1) {
        const text = (node.innerText ?? '').trim()
        if (text.length > 0 && text.length < 64 && !/Открыть|Отмена|Новая папка|скрытые|Open|Cancel|New folder|hidden/i.test(text)) {
          rememberWorkspace(text.split('\n')[0].trim())
          return
        }
        node = node.parentElement
      }
    }, true)
  }

  /** Пройти диалог выбора каталога за человека. */
  function resumeWorkspace(name) {
    const chooser = findButton(/рабочую область|workspace/i)
    if (chooser === undefined) return false
    chooser.click()
    setTimeout(() => {
      const dialog = document.querySelector('[role=dialog]')
      if (dialog === null) return
      const row = [...dialog.querySelectorAll('*')]
        .filter((e) => (e.textContent ?? '').trim() === name && e.children.length < 3)
        .pop()
      if (row !== undefined) row.click()
      setTimeout(() => {
        const open = [...(dialog.querySelectorAll('button') ?? [])].find((b) => /Открыть|Open/i.test(b.textContent ?? ''))
        if (open !== undefined) open.click()
      }, 900)
    }, 1200)
    return true
  }

  /** Кнопка предложения, когда композер просит область. */
  function rememberBar() {
    const existing = document.getElementById('dshm-resume')
    const editor = document.querySelector('[contenteditable]')
    const disabled = editor !== null && editor.getAttribute('contenteditable') === 'false'
    if (!disabled) {
      if (existing !== null) existing.remove()
      return
    }
    const saved = rememberedWorkspace()
    if (!disabled || saved === null) {
      if (existing !== null) existing.remove()
      return
    }
    if (existing !== null) return
    const bar = document.createElement('button')
    bar.id = 'dshm-resume'
    bar.type = 'button'
    bar.className = 'dshm-resume'
    bar.textContent = `Продолжить в «${saved.name}»`
    bar.addEventListener('click', () => { resumeWorkspace(saved.name); bar.remove() })
    document.body.appendChild(bar)
  }

