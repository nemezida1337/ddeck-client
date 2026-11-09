/*
 * DDeck — поведение мобильного слоя.
 *
 * Слой не перерисовывает интерфейс: он добавляет то, чего у настольной вёрстки нет —
 * кнопку меню, затемнение, понятие «панель открыта», двухшаговый выбор сессии,
 * системную «назад», клавиатуру в терминале и уведомления через нативный мост
 * приложения. Всё остальное приходит из skin.css.
 *
 * Правило, которое здесь соблюдается: ничего не подменять, пока не измерено. Каждый
 * селектор и жест ниже проверены на живой странице; имена классов у клиента
 * хешированные, поэтому совпадение идёт по окончанию имени или по публичному
 * data-атрибуту клиента, а не по точному значению.
 *
 * Публичные контракты слоя (их читают инструменты и замеры):
 *   window.__dshRemoteLayer — слой уже применён (повторная вставка выходит сразу);
 *   window.__dshmStartError  — текст ошибки старта, если слой не поднялся;
 *   window.__dshmPause       — пауза периодических обходов для замеров;
 *   window.__dshmNoBlur      — не снимать фокус с полей (для замеров);
 *   событие dsh-mobile:native-back — системная «назад» от оболочки; preventDefault
 *   означает «страница обработала жест сама».
 *
 * ОГЛАВЛЕНИЕ
 *   1. Состояние и общие помощники (DOM, подписи, фокус, флаги замеров)
 *   2. Боковая панель и выбор строки сессии
 *   3. Фокус и клавиатура
 *   4. Навигация и системная «назад»
 *   5. Тема и рабочая область
 *   6. Наблюдение за страницей: статистика хода
 *   7. Уведомления через нативный мост
 *   8. Композер, очередь и подписи
 *   9. Карточка вопроса агента
 *  10. Скрытие настольных элементов
 *  11. Старт слоя
 */
(function () {
  'use strict'
  if (window.__dshRemoteLayer) return
  window.__dshRemoteLayer = true


  /**
   * Язык интерфейса слоя: русский или английский.
   *
   * DSH ставит `lang` на документ, но у `/m` и панели он может отличаться; явный
   * `?lang=en` и `navigator.language` — запасные источники.
   *
   * @returns {'ru'|'en'} язык.
   */
  function uiLang() {
    let raw = ''
    try { raw = new URLSearchParams(location.search).get('lang') || '' } catch { raw = '' }
    raw = raw || document.documentElement.getAttribute('lang') || navigator.language || 'ru'
    return raw.toLowerCase().startsWith('en') ? 'en' : 'ru'
  }

  /** Английские подписи; ключ — русский текст, чтобы правки не расходились. */
  const EN_TEXT = {
    'Меню': 'Menu',
    'Закрыть меню': 'Close menu',
    'Закрыть': 'Close',
    'Статистика': 'Stats',
    'Субагенты': 'Subagents',
    'Фоновые задачи': 'Background tasks',
    'Токены': 'Tokens',
    'Контекст': 'Context',
    'DDeck — это ваш компьютер': 'DDeck is your computer',
    'Чаты, файлы, терминал и настройки работают на Mac. Телефон только показывает и управляет.': 'Chats, files, terminal and settings run on your Mac. The phone only displays and controls them.',
    'Нижняя панель — быстрые инструменты': 'The bottom bar holds your tools',
    'Листайте её влево-вправо. Кнопка с точками открывает все инструменты; свайп вверх по панели делает то же самое.': 'Swipe it left and right. The dots button opens all tools; swiping up on the bar does the same.',
    'Соберите панель под себя': 'Build the bar for yourself',
    'В сетке нажмите «Изменить» и коснитесь плитки: инструмент убирается из панели или возвращается. Лишние остаются в меню.': 'In the grid tap “Edit” and then a tile: the tool leaves the bar or comes back. Hidden ones stay in the grid.',
    'Порядок и управление': 'Order and controls',
    'Долгое нажатие на иконке — перетащить. Шеврон справа сворачивает панель. Настройки — «Вы вошли в DeepSeek».': 'Long-press an icon to drag it. The chevron on the right collapses the bar. Settings live under your account.',
    'Как пользоваться DDeck': 'How to use DDeck',
    'Пропустить': 'Skip',
    'Понятно': 'Got it',
    'Далее': 'Next',
    'Все инструменты': 'All tools',
    'Инструменты': 'Tools',
    'Изменить': 'Edit',
    'Настройка нижней панели': 'Customize the bottom bar',
    'Сбросить': 'Reset',
    'Вернуть все инструменты в панель': 'Restore all tools to the bar',
    'Готово': 'Done',
    'Как пользоваться': 'How to use',
    'Поиск инструмента': 'Search tools',
    'Инструменты появятся, когда откроется чат': 'Tools appear when a chat is open',
    'Боковое меню': 'Sidebar',
    'Новая сессия': 'New session',
    'Поиск сессий': 'Search sessions',
    'Плагины': 'Plugins',
    'Автоматические задачи': 'Automations',
    'Аккаунт': 'Account',
    'Задачи': 'Tasks',
    'Ещё': 'More',
    'Вы вошли в DeepSeek': 'Signed in to DeepSeek',
    'Правая панель': 'Right panel',
    'Развернуть панель инструментов': 'Expand tools bar',
    'Свернуть панель инструментов': 'Collapse tools bar',
    'Свернуть боковую панель': 'Collapse sidebar',
    'Свернуть панель': 'Collapse panel',
    'Листайте панель · удерживайте иконку, чтобы переставить': 'Swipe the bar · long-press an icon to reorder',
    'Команда агентов': 'Agent team',
    'Очередь уйдёт после ответа': 'The queue will be sent after the reply',
    'Задача завершена': 'Task finished',
    'Задача в DSH завершена': 'Your DSH task finished',
    'Нужен ваш ответ': 'Input needed',
    'DSH ждёт вашего выбора': 'DSH waits for your choice',
    'Уведомления отключены — включите их в настройках приложения': 'Notifications are off — enable them in the app settings',
    'Подключить телефон': 'Connect a phone',
    'Сменить компьютер': 'Switch computer',
    'Второй телефон': 'Second phone',
    'Просмотр субагента': 'Subagent view',
    'Отправка сообщений недоступна — это история выполнения.': 'Sending messages is unavailable — this is the execution history.',
    'Пароль': 'Password',
    'Введите пароль, который задан на компьютере': 'Enter the password set on the computer',
    'Открыть окно подключения': 'Open pairing',
    'Отмена': 'Cancel',
    'Покажите QR второму телефону': 'Show this QR to the second phone',
    'Код': 'Code',
    'Пароль не задан на компьютере. Откройте DDeck → «Подключить телефон» и задайте его.': 'No password is set on the computer. Open DDeck → “Second phone” and set one.',
    'Неверный пароль': 'Wrong password',
    'Не удалось открыть подключение': 'Could not open pairing',
    'Пароль хранится только на компьютере': 'The password stays on the computer',
  }

  /** Русские подписи действий и инструментов по стабильному ключу. */
  const ACTION_LABELS = {
    menu: 'Боковое меню',
    newSession: 'Новая сессия',
    search: 'Поиск сессий',
    plugins: 'Плагины',
    tasks: 'Автоматические задачи',
    files: 'Правая панель',
  }
  const TOOL_LABELS = {
    agents: 'Команда агентов',
    subagents: 'Субагенты',
    jobs: 'Фоновые задачи',
  }

  /** Текущий язык слоя, чтобы не перерисовывать подписи без смены языка. */
  let lastLocale = ''

  /** Обновить статически созданные подписи при смене языка. */
  function applyLocale() {
    const next = uiLang()
    if (next === lastLocale) return
    lastLocale = next
    if (menu !== null) menu.setAttribute('aria-label', tr('Меню'))
    if (scrim !== null) scrim.setAttribute('aria-label', tr('Закрыть меню'))
    for (const button of document.querySelectorAll('[data-dshm-action]')) {
      const label = ACTION_LABELS[button.dataset.dshmAction]
      if (label === undefined) continue
      button.setAttribute('aria-label', tr(label))
      button.title = tr(label)
    }
    for (const button of document.querySelectorAll('[data-dshm-tool]')) {
      const label = TOOL_LABELS[button.dataset.dshmTool]
      if (label === undefined) continue
      button.setAttribute('aria-label', tr(label))
      button.title = tr(label)
    }
    for (const button of document.querySelectorAll('[data-dshm-grid]')) {
      button.setAttribute('aria-label', tr('Все инструменты'))
      button.title = tr('Все инструменты')
    }
    const toggle = document.querySelector('.dshm-dock-toggle')
    if (toggle !== null) {
      const label = document.documentElement.getAttribute('data-dshm-dock-collapsed') === '1'
        ? tr('Развернуть панель инструментов') : tr('Свернуть панель инструментов')
      toggle.setAttribute('aria-label', label)
      toggle.title = label
    }
    const collapse = document.querySelector('[data-dshm-collapse]')
    if (collapse !== null) {
      collapse.setAttribute('aria-label', tr('Свернуть боковую панель'))
      const span = collapse.querySelector('span')
      if (span !== null) span.textContent = tr('Свернуть панель')
    }
    for (const button of document.querySelectorAll('.dshm-bottom-button')) {
      const short = button.getAttribute('data-dshm-short-label') || ''
      const full = button.getAttribute('data-dshm-full-label') || short
      button.setAttribute('aria-label', tr(short))
      button.title = tr(full)
      const label = button.querySelector('.dshm-bottom-label')
      if (label !== null) label.textContent = tr(short)
    }
    const hint = document.querySelector('.dshm-dock-hint')
    if (hint !== null) hint.textContent = tr('Листайте панель · удерживайте иконку, чтобы переставить')
    // Открытые меню на языке, которого больше нет, закрываем: при следующем
    // открытии они соберутся на новом языке.
    if (document.querySelector('.dshm-grid') !== null) closeToolGrid()
    if (document.querySelector('.dshm-onboard') !== null) showOnboarding(true)
  }

  /** Наблюдать за сменой языка документа без перезагрузки. */
  function watchLocale() {
    lastLocale = uiLang()
    new MutationObserver(() => applyLocale()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    })
  }

  /**
   * Перевести подпись слоя.
   *
   * @param {string} text русская подпись.
   * @returns {string} подпись на языке интерфейса.
   */
  function tr(text) {
    return uiLang() === 'en' ? (EN_TEXT[text] ?? text) : text
  }

