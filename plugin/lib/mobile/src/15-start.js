  /* ── 11. СТАРТ СЛОЯ ───────────────────────────────────────────────────── */

  /**
   * Поднять слой: тема, кнопка меню, переходы, «назад», фокус и уведомления.
   *
   * Ошибка на старте не должна оставлять страницу без слоя молча: текст кладётся в
   * window.__dshmStartError, по нему инструменты отличают «слой не поднялся» от
   * «слой работает, но правило не сработало».
   */
  function start() {
    try {
      applyTheme()
      watchLocale()
      captureWorkspaceClick()
      new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] })
      build()
      // CSRF-заголовок здесь больше не ставим: шлюз принимает same-origin запросы без него
      // (заголовок браузера подделать нельзя, Origin проверяется строго). Вызов оставляли —
      // и он валил старт слоя целиком, когда функцию убрали: ниже не выполнялось ничего.

      watch()
      watchSettingsModal()
      guardAutofocus()
      translate()
      new MutationObserver(translate).observe(document.body, { childList: true, subtree: true })
      closeOnNavigate()
      installSearchFocusGuard()
      bindPanelCollapse()
      bindSessionPicking()
      bindBackButton()
      // Закрытие по системной кнопке «назад» — единственный жест, который на телефоне
      // ожидают все: открыть панель и вернуться назад должно закрывать панель, а не сайт.
      bindEscapeClose()
    } catch (error) { window.__dshmStartError = String(error && error.message || error) }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
}())
