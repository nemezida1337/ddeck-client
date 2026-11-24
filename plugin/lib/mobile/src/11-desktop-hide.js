  /* ── 10. СКРЫТИЕ НАСТОЛЬНЫХ ЭЛЕМЕНТОВ ───────────────────────────────────
   * «Mobile access» заменён нашим «Remote», а «Открыть в Finder» и «Другие
   * способы открыть» открывают системный диалог компьютера — на телефоне они
   * бесполезны и занимают шапку чата.
   */

  /**
   * Спрятать то, что на телефоне не имеет смысла.
   *
   * «Mobile access» заменён нашим «Remote», а «Открыть в Finder» и «Другие способы открыть»
   * открывают системный диалог компьютера — на телефоне они бесполезны и занимают шапку
   * чата (замер: кнопки в точках 215 и 238 при ширине экрана 360).
   */
  const DESKTOP_ONLY = /^(Mobile access|DDeck|Открыть в Finder|Open in Finder|Другие способы открыть|Other ways to open|Показать расположение файла|Reveal in Finder)$/iu

  function hideLegacyMobileAccess() {
    for (const row of document.querySelectorAll(':is([class$="_panelRow"], [class*="_panelRow "]), button')) {
      const label = (row.getAttribute('aria-label') || '').trim()
      const text = (row.innerText || '').trim()
      if (!DESKTOP_ONLY.test(label) && !DESKTOP_ONLY.test(text)) continue
      if (row.getAttribute('data-dshm-hidden') === '') continue
      row.setAttribute('data-dshm-hidden', '')
      row.style.display = 'none'
    }
    ensureBottomSidebarNav()
  }

