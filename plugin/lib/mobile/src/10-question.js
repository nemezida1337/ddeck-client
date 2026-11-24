  /* ── 9. КАРТОЧКА ВОПРОСА АГЕНТА ─────────────────────────────────────────
   * Enter в поле свободного ответа — перевод строки, а не отправка. Раньше это
   * поведение давал чужой компонент dsh-mobile-question-fixes; мы от него уходим
   * и сохраняем поведение своим слоем — только для касания и без модификаторов.
   */

  /**
   * Enter в поле свободного ответа карточки вопроса — перевод строки, не отправка.
   *
   * На телефоне Enter в textarea вопроса отправлял ответ: клиент вешает обработчик на
   * документ. Раньше это поведение давал чужой компонент `dsh-mobile-question-fixes`;
   * мы от него уходим, поэтому сохраняем поведение своим слоем (как и он — только для
   * касания и без модификаторов, до обработчика клиента).
   */
  function installQuestionEnterNewline() {
    const touchPrimary = window.matchMedia('(hover: none), (pointer: coarse)')
    document.addEventListener('keydown', (event) => {
      if (!touchPrimary.matches) return
      if (event.key !== 'Enter' || event.defaultPrevented || event.isComposing || event.keyCode === 229) return
      if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
      const target = event.target
      if (!(target instanceof HTMLTextAreaElement) || target.disabled || target.readOnly) return
      if (target.closest('[data-question-key]') === null) return
      event.stopPropagation()
    }, true)
  }

