  /* ── 8. КОМПОЗЕР, ОЧЕРЕДЬ И ПОДПИСИ ─────────────────────────────────────
   * Подсказка про Cmd/Ctrl+Enter — настольная: системная клавиатура телефона
   * такую комбинацию не присылает. Заменяем её на то, что произойдёт на самом
   * деле, и делаем это не чаще раза в секунду.
   */

  /**
   * Подсказка в поле ввода про Cmd/Ctrl+Enter — настольная.
   *
   * Пока агент работает и в очереди есть сообщения, клиент пишет в подсказке
   * «Cmd/Ctrl+Enter — отправить всю очередь с вмешательством». На телефоне такой
   * комбинации нет: системная клавиатура не присылает Ctrl, и подсказка обещает
   * жест, которого человек не может сделать. Заменяем на то, что произойдёт на
   * самом деле: очередь уйдёт после ответа.
   *
   * Подсказку рисует клиент, поэтому её текст — его узел. Замена идёт через
   * MutationObserver ниже, и чтобы поток переписки не гонял поиск по странице на
   * каждом кадре, у перевода есть шаг в секунду: подсказка не настолько срочная.
   */
  const QUEUE_HINT = /^Cmd\/Ctrl\+Enter/u

  const QUEUE_HINT_MOBILE = {
    ru: 'Очередь уйдёт после ответа',
    en: 'The queue will be sent after the reply',
    zh: '消息将在回复后发送',
  }

  let translatedAt = 0

  let placeholderNode = null

  function translateQueueHint() {
    // Узел подсказки кэшируем: поиск по окончанию класса обходит всю страницу, а
    // перевод идёт на каждое изменение DOM — не хочется платить за это на каждом
    // символе ввода. Если React пересоздал узел, ключ теряет связь и поиск повторяется.
    if (placeholderNode === null || !placeholderNode.isConnected) {
      placeholderNode = document.querySelector(':is([class$="_placeholder"], [class*="_placeholder "])')
    }
    const placeholder = placeholderNode
    if (placeholder === null) return
    const text = (placeholder.textContent ?? '').trim()
    if (!QUEUE_HINT.test(text)) return
    const language = uiLang()
    placeholder.textContent = QUEUE_HINT_MOBILE[language] ?? QUEUE_HINT_MOBILE.ru
  }

  /**
   * Поле поиска по сессиям: на телефоне полная подсказка «Поиск по названиям
   * сессий» не влезает между иконкой поиска и кнопкой очистки и обрезается.
   * Короткая подпись остаётся понятной, а поле — целым.
   */
  function shortenSessionSearchPlaceholder() {
    const pattern = /^(Поиск по названиям сессий|Search sessions by name|按名称搜索会话)$/iu
    for (const input of document.querySelectorAll('input[placeholder]')) {
      if (!pattern.test(input.placeholder)) continue
      const short = tr('Поиск сессий')
      if (input.placeholder !== short) input.placeholder = short
    }
  }

  /** Перевод и адаптация подписей, которые зависят от телефона. */
  function translate() {
    const now = Date.now()
    if (now - translatedAt < 1000) return
    translatedAt = now
    translateQueueHint()
    shortenSessionSearchPlaceholder()
  }

  /** Закрывать панель после перехода и не поднимать клавиатуру. */

