  /* ── 10b. ВТОРОЙ ТЕЛЕФОН ────────────────────────────────────────────────
   * Настольная панель DDeck умеет открыть окно сопряжения; телефону нужен
   * такой же путь, но с паролем, иначе любой, кто получил разблокированный
   * телефон, добавил бы себе ещё один. Пароль задаётся на компьютере.
   */


  /**
   * Запросить у сервера окно сопряжения после проверки пароля.
   *
   * Пароль не сохраняется и не уходит в лог: поле очищается сразу после запроса.
   */
  function openMobilePair() {
    if (document.getElementById('dshm-pair') !== null) return
    const overlay = document.createElement('div')
    overlay.id = 'dshm-pair'
    overlay.className = 'dshm-pair-overlay'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', tr('Подключить телефон'))

    const card = document.createElement('div')
    card.className = 'dshm-pair-card'
    const title = document.createElement('div')
    title.className = 'dshm-pair-title'
    title.textContent = tr('Подключить телефон')
    const note = document.createElement('div')
    note.className = 'dshm-pair-note'
    note.textContent = tr('Введите пароль, который задан на компьютере')
    const input = document.createElement('input')
    input.type = 'password'
    input.className = 'dshm-pair-input'
    input.autocomplete = 'new-password'
    input.placeholder = tr('Пароль')
    input.setAttribute('aria-label', tr('Пароль'))
    const error = document.createElement('div')
    error.className = 'dshm-pair-error'
    error.setAttribute('role', 'alert')
    const submit = document.createElement('button')
    submit.type = 'button'
    submit.className = 'dshm-pair-submit'
    submit.textContent = tr('Открыть окно подключения')
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'dshm-pair-cancel'
    cancel.textContent = tr('Отмена')
    const result = document.createElement('div')
    result.className = 'dshm-pair-result'
    card.append(title, note, input, error, submit, cancel, result)
    overlay.appendChild(card)
    document.body.appendChild(overlay)
    const close = () => overlay.remove()
    cancel.addEventListener('click', close)
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close() })
    // Не поднимаем клавиатуру автоматически: иначе диалог прыгает и «моргает».
    submit.addEventListener('click', async () => {
      const password = input.value
      if (password.length === 0) { error.textContent = tr('Введите пароль'); return }
      submit.disabled = true
      error.textContent = ''
      try {
        const response = await fetch('/dsh-remote/mobile-pair', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        const data = await response.json().catch(() => ({}))
        input.value = ''
        if (!response.ok || data.ok !== true) {
          if (data.error === 'pin_not_set') error.textContent = tr('Пароль не задан на компьютере. Откройте DDeck → «Подключить телефон» и задайте его.')
          else if (data.error === 'invalid_password') error.textContent = tr('Неверный пароль')
          else error.textContent = tr('Не удалось открыть подключение')
          submit.disabled = false
          return
        }
        title.textContent = tr('Покажите QR второму телефону')
        note.textContent = tr('Отсканируйте код камерой DDeck на втором телефоне.')
        input.remove()
        submit.remove()
        cancel.textContent = tr('Закрыть')
        const qr = document.createElement('div')
        qr.className = 'dshm-pair-qr'
        qr.innerHTML = String(data.qrSvg ?? '')
        const code = document.createElement('div')
        code.className = 'dshm-pair-code'
        code.textContent = `${tr('Код')}: ${String(data.code ?? '')}`
        const hint = document.createElement('div')
        hint.className = 'dshm-pair-note'
        hint.textContent = tr('Пароль хранится только на компьютере')
        result.append(qr, code, hint)
      } catch {
        input.value = ''
        error.textContent = tr('Не удалось открыть подключение')
        submit.disabled = false
      }
    })
  }

