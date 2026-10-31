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
    for (const button of document.querySelectorAll('[data-dshm-grid], .dshm-grid-launcher')) {
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

  /* ── 1. СОСТОЯНИЕ И ОБЩИЕ ПОМОЩНИКИ ───────────────────────────────────────
   * Флаги состояния слоя, DOM-помощники, подписи кнопок, снятие фокуса и два
   * флага для замеров. Всё остальное ниже опирается на эти функции.
   */

  /**
   * Открыта ли панель.
   *
   * Клиент не сообщает состояние ни атрибутом, ни устойчивым классом, а подписи
   * переводимы. Единственный надёжный источник — то, что сделали мы сами.
   */
  let drawerOpen = false

  /** Отложенная повторная попытка открыть ящик, когда дерево ещё не отрисовано. */
  let drawerRetryTimer = 0

  /** Когда ящик открыли: пустой клиентский ящик закрываем только после паузы. */
  let drawerOpenedAt = 0

  /**
   * Есть ли в панели клиента хоть какое-то содержимое.
   *
   * Пустая/недорисованная колонка выглядит как «мёртвое меню»; показывать её нельзя.
   *
   * @returns {boolean} дерево, строки панелей или кнопка новой сессии.
   */
  function hasSidebarContent() {
    const sidebar = document.querySelector(':is([class$="_sidebarCol"], [class*="_sidebarCol "])')
    if (sidebar === null) return false
    return [...sidebar.querySelectorAll('[role=treeitem], :is([class$="_newSession"], [class*="_newSession "])')]
      .some((element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      })
  }

  /** Открыта ли правая панель клиента (следим по нажатиям её кнопок). */
  let rightPanelVisible = false

  let scrim = null


  let menu = null

  /** Привести панель и модель в согласие: один клик по кнопке клиента на переход. */
  let suppressCloseUntil = 0

  /**
   * Окно, в котором авт фокус поля ввода подавляется.
   *
   * Клиент, открывая сессию, сам ставит курсор в композер. На телефоне это
   * выглядит как моргнувшая клавиатура: замер — focus в композере через 80 мс
   * после касания строки, высота окна 421 на 297-й мс (клавиатура выехала),
   * снова 800 на 521-й (наш blur). Подавляем фокус сразу при событии focusin:
   * проверено на телефоне — клавиатура не появляется вовсе.
   */
  let suppressTextFocusUntil = 0

  /**
   * Строка сессии, выбранная первым касанием.
   *
   * На настольном клиенте закрепить/архивировать сессию можно с наведения мыши.
   * На телефоне наведения нет, а одиночное касание сразу открывало диалог, и
   * добраться до действий было нечем. Поэтому первый тап по строке выбирает её
   * (подсветка + кнопки действий), второй — открывает диалог. Клика мимо строки
   * или закрытие панели выбор снимают.
   */
  let pickedRow = null

  /**
   * Пропустить выбор и выполнить переход программным нажатием.
   *
   * Программные `.click()` (возврат «назад» из вторичных экранов) должны сразу
   * открывать диалог, а не выделять строку.
   */
  let bypassPickedUntil = 0

  /**
   * Прямоугольник элемента в координатах окна.
   *
   * @param {Element} element элемент.
   * @returns {DOMRect} прямоугольник.
   */
  function rect(element) {
    return element.getBoundingClientRect()
  }

  /**
   * Нарисован ли элемент: у него есть ненулевая площадь.
   *
   * @param {Element} element элемент.
   * @param {boolean} [height] требовать ли ненулевую высоту (по умолчанию да).
   * @returns {boolean} есть ли у элемента видимая площадь.
   */
  function visible(element, height = true) {
    const box = rect(element)
    return box.width > 0 && (height === false || box.height > 0)
  }

  /**
   * Виден ли элемент в текущем окне, а не просто существует в разметке.
   *
   * Кнопка правой панели существует и когда панель разложена, но лежит за правым
   * краем (x ≈ 670 при экране 360) — её надо отличать от той, что на экране.
   *
   * @param {Element} element элемент.
   * @param {boolean} [height] требовать ли ненулевую высоту.
   * @returns {boolean} элемент на экране.
   */
  function onScreen(element, height = true) {
    if (!visible(element, height)) return false
    const box = rect(element)
    return box.x >= 0 && box.x < window.innerWidth
  }

  /**
   * Все кнопки в поддереве.
   *
   * @param {ParentNode} [root] где искать (по умолчанию документ).
   * @returns {HTMLButtonElement[]} кнопки в порядке документа.
   */
  function buttons(root = document) {
    return [...root.querySelectorAll('button')]
  }

  /**
   * Кнопка, подпись которой удовлетворяет шаблону.
   *
   * Подписи интерфейса переводимы, поэтому ищем не точный текст, а шаблон. Шаблоны
   * ниже содержат русские, английские и китайские варианты: с русским интерфейсом
   * часть строк клиента остаётся английской.
   *
   * @param {RegExp} pattern шаблон подписи.
   * @param {ParentNode} [root] где искать.
   * @param {{ text?: boolean }} [options] искать и по видимому тексту, а не только по aria-label.
   * @returns {HTMLButtonElement|undefined} найденная кнопка.
   */
  function findButton(pattern, root = document, { text = false } = {}) {
    return buttons(root).find((button) => {
      const aria = (button.getAttribute('aria-label') || '').trim()
      if (!text) return pattern.test(aria)
      return pattern.test(`${button.innerText || ''} ${aria}`.trim())
    })
  }

  /**
   * Поле, из-за которого поднимается клавиатура.
   *
   * Снимать фокус только с редактора мало: на экране автозадач есть поле поиска
   * (`input`), и после него клавиатура оставалась висеть над панелью.
   */
  function isTextEntry(element) {
    if (!(element instanceof HTMLElement)) return false
    if (element.isContentEditable) return true
    if (element instanceof HTMLInputElement) return !/^(button|checkbox|radio|submit|range)$/u.test(element.type)
    return element instanceof HTMLTextAreaElement
  }

  /**
   * Снять фокус с поля ввода через несколько задержек.
   *
   * Клиент может поставить фокус не сразу и не один раз: разметка перерисовывается
   * после касания. Одна задержка ловила клавиатуру не всегда, поэтому мест было
   * четыре с одинаковым циклом — теперь он один.
   *
   * @param {number[]} delays задержки в миллисекундах.
   * @param {boolean} [ignoreNoBlur] снимать фокус даже под флагом замеров __dshmNoBlur.
   */
  function scheduleBlur(delays, ignoreNoBlur = false) {
    for (const delay of delays) {
      setTimeout(() => {
        if (!ignoreNoBlur && noBlur()) return
        const active = document.activeElement
        if (isTextEntry(active)) active.blur()
      }, delay)
    }
  }

  /**
   * Пауза фоновых таймеров — для замеров.
   *
   * `window.__dshmPause = true` останавливает всю периодическую работу слоя, чтобы
   * отделить свою стоимость от стоимости клиента.
   */
  function paused() {
    return window.__dshmPause === true
  }

  /** Флаг для замеров: не снимать фокус (проверяем его стоимость). */
  function noBlur() {
    return window.__dshmNoBlur === true
  }

  /* ── 2. БОКОВАЯ ПАНЕЛЬ И ВЫБОР СТРОКИ СЕССИИ ─────────────────────────────
   * На телефоне панель клиента заменена нашим выдвижным ящиком: клиентская
   * колонка сдвинута за край, но её дерево остаётся в DOM — список сессий,
   * группы и отметки рисует клиент. Первый тап по строке выбирает её и
   * показывает действия, второй — открывает диалог.
   */

  /**
   * Закрыть панель, не дёргая родную кнопку клиента.
   *
   * `setDrawer(false)` кликает по кнопке сворачивания внутри колонки — и этот клик
   * сбивает переход, который человек только что выбрал: экран «Плагины» не открывался.
   * Здесь только наш слой: атрибут и затенение.
   */
  function closeDrawerLight() {
    window.clearTimeout(drawerRetryTimer)
    if (!drawerOpen) return
    drawerOpen = false
    document.documentElement.removeAttribute('data-dshm-drawer')
    if (scrim !== null) scrim.setAttribute('aria-hidden', 'true')
    // Вернуть правую панель/вкладки, которые прятали под ящиком.
    for (const element of document.querySelectorAll('[data-dshm-under-drawer]')) element.removeAttribute('data-dshm-under-drawer')
    scheduleBlur([120, 400, 900])
  }

  function setDrawer(open) {
    if (!open) {
      clearPickedRow()
      window.clearTimeout(drawerRetryTimer)
    }
    // Пустой ящик не должен появляться никогда: если дерево клиента не нарисовано,
    // просим клиент нарисовать его до показа.
    if (open) {
      keepClientPanelOpen()
      // Пустой ящик — это «мёртвое» меню: клиент ещё не отрисовал дерево
      // (переход/перезагрузка). Не показываем его; пробуем ещё раз чуть позже.
      if (!hasSidebarContent()) {
        window.clearTimeout(drawerRetryTimer)
        drawerRetryTimer = window.setTimeout(() => {
          if (!drawerOpen && hasSidebarContent()) setDrawer(true)
        }, 300)
        return
      }
      // Левое меню — единственный видимый слой: правую панель/вкладки/журнал и
      // шторки прячем (не закрывая, чтобы не терять состояние), иначе интерфейс
      // выглядит «слоёным». После закрытия меню они возвращаются как были.
      if (typeof closeToolSheet === 'function') closeToolSheet()
      if (document.querySelector('.dshm-grid') !== null) closeToolGrid()
      for (const element of document.querySelectorAll('[class*="tabHost"], [data-sidebar-right-panel]')) {
        element.dataset.dshmUnderDrawer = '1'
      }
    }
    // Открывая панель, убираем фокус из поля ввода.
    //
    // Иначе клавиатура остаётся поднятой и накрывает панель: человек набрал текст,
    // открыл меню — и вместо списка сессий видит половину экрана. Проверено: высота
    // страницы падала с 800 до 421, фокус оставался в редакторе.
    if (open && document.activeElement instanceof HTMLElement) document.activeElement.blur()
    if (open === drawerOpen) {
      if (open) document.documentElement.setAttribute('data-dshm-drawer', '')
      else document.documentElement.removeAttribute('data-dshm-drawer')
      return
    }
    // Родную кнопку больше не нажимаем: панель клиента держится открытой постоянно
    // (см. keepClientPanelOpen), а её переключение на каждое открытие заставляло клиент
    // заново строить дерево — замер показал кадр 175 мс и 257 мс длинных задач.
    // Наш drawer — только CSS-состояние.
    drawerOpen = open
    if (open) {
      drawerOpenedAt = Date.now()
      document.documentElement.setAttribute('data-dshm-drawer', '')
    }
    else document.documentElement.removeAttribute('data-dshm-drawer')
    if (!open) {
      for (const element of document.querySelectorAll('[data-dshm-under-drawer]')) element.removeAttribute('data-dshm-under-drawer')
    }
    if (scrim !== null) scrim.setAttribute('aria-hidden', open ? 'false' : 'true')
    // Закрытие панели тоже не должно поднимать клавиатуру: человек убрал меню, а не
    // собрался печатать. Проверено: после закрытия высота падала до 421.
    if (!open) scheduleBlur([120, 400, 900], true)
  }

  function closeDrawer() {
    setDrawer(false)
  }

  /** Снять выбор со строки сессии. */
  function clearPickedRow() {
    if (pickedRow === null) return
    pickedRow.removeAttribute('data-dshm-picked')
    pickedRow = null
  }

  /**
   * Выбрать строку сессии первым касанием.
   *
   * @param {Element} row строка сессии ([role=treeitem] без aria-expanded).
   */
  function pickRow(row) {
    clearPickedRow()
    pickedRow = row
    row.setAttribute('data-dshm-picked', '')
  }

  /**
   * Двухшаговый выбор сессии: первый тап показывает действия, второй открывает.
   *
   * Перехват идёт в фазе до React: событие, которое должно только выбрать
   * строку, до клиента не доходит и диалог не открывается. Второй тап свободно
   * проходит дальше — клиент открывает сессию, а наш обычный обработчик
   * перехода закрывает меню.
   */

  /**
   * Кнопка «Свернуть боковую панель» внутри панели клиента закрывает наш ящик.
   *
   * Клиент по этой кнопке прячет собственную панель. На телефоне это значит, что
   * дерево сессий исчезает, а наш ящик остаётся и выглядит пустым — человек
   * видит «другую пустую панель» при следующем открытии. Поэтому касание
   * перехватываем до клиента и закрываем то, что действительно открыто.
   */
  function bindPanelCollapse() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null
      if (target === null) return
      if (!/^(Свернуть боковую панель|Collapse sidebar|收起侧边栏)$/u.test((target.getAttribute('aria-label') || '').trim())) return
      event.preventDefault()
      event.stopPropagation()
      closeDrawerLight()
    }, true)
  }

  function bindSessionPicking() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (target === null) return
      if (Date.now() < bypassPickedUntil) {
        clearPickedRow()
        return
      }
      const row = target.closest('[role=treeitem]')
      if (row === null || row.getAttribute('aria-expanded') !== null) {
        clearPickedRow()
        return
      }
      // Двухшаговый выбор — только для настоящих строк сессий (`data-row-key`
      // начинается с `session:`). Остальные treeitem'ы (результаты поиска,
      // строки субагентов в правой панели) не должны перехватываться: иначе
      // первый тап по стрелке «открыть на боковой панели» уходил в выбор строки,
      // а не в кнопку, и требовался второй тап.
      const rowKey = row.getAttribute('data-row-key') ?? ''
      if (!rowKey.startsWith('session:')) {
        clearPickedRow()
        return
      }
      // Кнопки действий живут внутри выбранной строки: меню открывает клиент,
      // но это действие над строкой, а не переход — панель закрывать нельзя.
      // Ради этого касания обычный обработчик перехода на мгновение глушится.
      if (target.closest(':is([class$="_rowActions"], [class*="_rowActions "])') !== null) {
        suppressCloseUntil = Date.now() + 400
        return
      }
      if (row.hasAttribute('data-dshm-picked')) {
        clearPickedRow()
        return
      }
      event.preventDefault()
      event.stopPropagation()
      pickRow(row)
    }, true)
  }

  /** Когда последний раз пытались вернуть панель клиента, мс. */
  let lastPanelOpenTry = 0

  /**
   * Держать дерево клиента отрисованным.
   *
   * Панель клиента на телефоне заменена нашим слоем: она сдвинута за край, но её
   * содержимое должно существовать в DOM, потому что список сессий, группы и
   * отметки рисует именно клиент. Клиент умеет её закрыть (кнопка «Свернуть
   * боковую панель», восстановление состояния после сворачивания приложения), и
   * тогда наш выдвижной ящик открывается пустым — ровно то, что человек видит
   * как «какая-то совсем другая пустая панель».
   *
   * Поэтому проверка повторяется, а не срабатывает один раз: если дерева нет и
   * есть кнопка «Открыть боковую панель», нажимаем её (сама панель остаётся за
   * краем — её показывает только наш ящик). Не чаще раза в две секунды, чтобы не
   * драться с человеком за состояние.
   */
  function keepClientPanelOpen() {
    const hasTree = document.querySelector(':is([class$="_list"], [class*="_list "]) [role=treeitem]') !== null
    if (hasTree) return
    const toggle = findButton(/Открыть боковую панель|Open sidebar|打开侧边栏/iu)
    if (toggle === undefined) return
    if (Date.now() - lastPanelOpenTry < 2000) return
    lastPanelOpenTry = Date.now()
    suppressCloseUntil = Date.now() + 500
    toggle.click()
  }

  /** Спрятать строку статистики под композером. */

  /** Создать кнопку меню и затенение под панелью один раз. */
  function build() {
    if (menu === null) {
      menu = document.createElement('button')
      menu.type = 'button'
      menu.className = 'dshm-menu'
      menu.setAttribute('aria-label', tr('Меню'))
      menu.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
      menu.addEventListener('click', () => { setDrawer(true) })
    }
    if (scrim === null) {
      scrim = document.createElement('button')
      scrim.type = 'button'
      scrim.className = 'dshm-scrim'
      scrim.setAttribute('aria-label', tr('Закрыть меню'))
      scrim.setAttribute('aria-hidden', 'true')
      scrim.addEventListener('click', closeDrawer)
    }
    // Оба узла живут на body: панель, из которой открывается меню, уезжает за край.
    if (menu.parentElement !== document.body) {
      document.body.appendChild(scrim)
      document.body.appendChild(menu)
    }
  }

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
      if (target.closest('[data-lexical-editor], [contenteditable], input, textarea, :is([class$="_composerStack"], [class*="_composerStack "])')) {
        suppressTextFocusUntil = 0
      }
    }, true)
  }

  /** Клик по кнопке не оставляет клавиатуру. */
  function blurOnButtonClick() {
    document.addEventListener('click', (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[contenteditable="true"], input, textarea')) return
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

  /* ── 4. НАВИГАЦИЯ И СИСТЕМНАЯ «НАЗАД» ───────────────────────────────────
   * Приложение шлёт странице cancelable-событие dsh-mobile:native-back и
   * уходит только если никто не позвал preventDefault. Порядок закрытия:
   * наша панель Remote, поповер клиента, правая панель, модальное окно,
   * диалог, детальный экран, вторичная страница, боковое меню. В самом
   * диалоге «назад» открывает меню — привычный жест.
   */

  /**
   * Вернуться из вторичного экрана в диалог и открыть меню.
   *
   * «Назад» на телефоне возвращает туда, откуда пришли: человек открыл «Плагины»
   * из бокового меню — назад ждёт то же меню, а не выход из приложения. Клиент не
   * использует history API (замер: history.length = 1 на любой странице), поэтому
   * переход делается нажатием на строку текущей сессии — тот же путь, которым он
   * ходит в диалог сам.
   *
   * @returns {boolean} удалось ли вернуться (false — строки текущей сессии нет).
   */
  function returnToChat() {
    let current = ''
    try { current = JSON.parse(localStorage.getItem('dsh.sessions.current') || '{}').sessionId || '' } catch {}
    /** Найти строку текущей сессии среди отрисованных. */
    const findRow = () => document.querySelector(`[role=treeitem][data-row-key="session:${current}"]`)
    /**
     * Перейти в переписку нажатием строки — тем же путём, которым ходит клиент.
     *
     * @param {Element} row строка текущей сессии.
     * @returns {boolean} всегда true: жест обработан.
     */
    const go = (row) => {
      suppressAutofocus()
      suppressCloseUntil = Date.now() + 1500
      // Меню открываем ДО перехода: клиент рисует переписку около секунды и
      // блокирует главный поток, а выезд панели идёт на композиторе. Открытая
      // сразу панель — это немедленный отклик на «назад»; иначе человек секунду
      // смотрит на замерший экран и только потом видит анимацию. Замер до правки:
      // переход в переписку 1073 мс, меню 1265 мс после нажатия.
      setDrawer(true)
      bypassPickedUntil = Date.now() + 200
      row.click()
      // Страховка: если клиент всё-таки сбросит состояние, вернуть меню.
      setTimeout(() => { if (!paused() && !drawerOpen) setDrawer(true) }, 700)
      return true
    }
    const row = findRow()
    if (row !== null) return go(row)
    // Строка не отрисована: текущая сессия может лежать в свёрнутой рабочей
    // области или за «Показать ещё». Раскрываем группы и пробуем снова — без
    // этого «назад» со вторичного экрана оставлял человека на «Плагины» с
    // открытым меню (проверено: текущая сессия в свёрнутой области).
    const collapsed = [...document.querySelectorAll('[role=treeitem][aria-expanded="false"]')]
    if (collapsed.length > 0) {
      setDrawer(true)
      suppressCloseUntil = Date.now() + 1500
      for (const group of collapsed) group.click()
      setTimeout(() => {
        if (paused()) return
        const late = findRow()
        if (late !== null) go(late)
      }, 350)
      return true
    }
    // Строки нет совсем (например, сессия скрыта фильтром): остаёмся в меню,
    // чтобы человек выбрал чат сам, и не даём оболочке закрыть приложение.
    setDrawer(true)
    return true
  }

  /**
   * Видимое модальное окно клиента (настройки и подобные).
   *
   * @returns {Element|undefined} окно или undefined, если модалок на экране нет.
   */
  function visibleClientModal() {
    return [...document.querySelectorAll('[data-shortcut-modal]')].find((element) => visible(element))
  }

  /** Закрыть модальное окно клиента — кнопкой, которую он сам рисует. */
  function closeClientModal() {
    const modal = visibleClientModal()
    if (modal === undefined) return false
    // Две схемы имён: client-модули дают `_hash_close`, примитивы — `_close_hash_line`.
    const close = modal.querySelector('[class*="_close"]')
      ?? findButton(/^(Закрыть|Close|关闭)$/u, modal)
    if (close === null || close === undefined) return false
    close.click()
    return true
  }

  /**
   * Закрыть диалог клиента, у которого нет своей кнопки закрытия-крестика.
   *
   * Диалоги вроде «Переименовать сессию» объявляют `role="dialog"` и закрываются
   * кнопкой «Отмена». Без этого «назад» закрывал боковое меню под диалогом, а сам
   * диалог оставался висеть поверх диалога — и следующее нажатие снова открывало
   * меню. Настройки сюда не попадают: у них `data-shortcut-modal` и свой крестик,
   * их закрывает [closeClientModal].
   *
   * @returns {boolean} закрыли ли диалог.
   */
  function closeClientDialog() {
    const dialogs = [...document.querySelectorAll('[role=dialog]')].filter((element) => {
      if (element.id === 'dshm-remote-panel') return false
      if (element.hasAttribute('data-shortcut-modal')) return false
      return visible(element)
    })
    // Диалоги накладываются друг на друга (статистика, токены, контекст, команда
    // агентов открываются из панели и не закрываются сами): «назад» должен снять
    // верхний, а не искать первый в DOM.
    const dialog = dialogs[dialogs.length - 1]
    if (dialog === undefined) return false
    const cancel = findButton(/^(Отмена|Cancel|Закрыть|Close|取消|关闭)$/u, dialog, { text: true })
    if (cancel !== undefined) {
      cancel.click()
      return true
    }
    const close = dialog.querySelector('[class*="_close"], button[aria-label*="Закрыть"], button[aria-label*="Close"], button[aria-label*="关闭"]')
    if (close !== null) {
      close.click()
      return true
    }
    // У панелей статистики нет своей кнопки: клиент закрывает их по Escape.
    // Событие уходит в документ, поэтому страница ведёт себя как от нажатия Esc.
    dialog.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true,
    }))
    return true
  }

  /**
   * Вернуться из детального экрана в его список.
   *
   * У страницы плагина/задачи есть своя кнопка-крошка «К списку плагинов»; системная
   * «назад» до неё не доходит и без этого открывала боковое меню поверх деталей.
   *
   * @returns {boolean} был ли детальный экран.
   */
  function closeClientDetail() {
    const back = buttons().find((element) => {
      if (!visible(element)) return false
      const label = (element.getAttribute('aria-label') || element.innerText || '').trim()
      // Детали автозадачи закрываются кнопкой «Закрыть подробности», у плагина —
      // крошкой «К списку …».
      return /^(К списку|Back to |Закрыть подробности|Close details|返回|关闭详情)/u.test(label)
    })
    if (back === undefined) return false
    back.click()
    return true
  }

  /**
   * Вторичный экран клиента: плагины, автоматические задачи и подобные страницы.
   *
   * Своего признака маршрута у них нет (адрес остаётся /m), но есть заголовок
   * страницы — его рисуют только такие экраны. У чата заголовка страницы нет.
   */
  function onSecondaryScreen() {
    for (const selector of [':is([class$="_pageTitle"], [class*="_pageTitle "])', ':is([class$="_pageHeading"], [class*="_pageHeading "])']) {
      const element = document.querySelector(selector)
      if (element !== null && rect(element).width > 0) return true
    }
    return false
  }

  /**
   * Закрыть открытый поповер клиента — меню команд, выбора модели и подобные.
   *
   * Системная «назад» до поповеров клиента не доходит: он закрывает их касанием
   * в любом другом месте страницы. Без этого «назад» с открытым меню композера
   * открывал поверх него боковое меню приложения. Шлём pointerdown в шапку —
   * безопасную точку: своего обработчика у неё нет, а меню закрывается.
   *
   * @returns {boolean} был ли открыт поповер.
   */
  function closeClientPopover() {
    const popover = [...document.querySelectorAll('[role=menu],[role=listbox]')]
      .find((element) => {
        const box = rect(element)
        return visible(element) && box.x < window.innerWidth && box.right > 0
      })
    if (popover === undefined) return false
    const neutral = document.querySelector('header') ?? document.body
    neutral.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
      clientX: 180,
      clientY: 60,
    }))
    return true
  }

  /**
   * Закрыть правую панель, если она открыта на экране.
   *
   * Панель открывается тапом по файлу/вкладке и накрывает диалог; на телефоне у
   * неё нет привычного места, а системная «назад» должна возвращать в диалог, а
   * не открывать боковое меню поверх панели.
   *
   * @returns {boolean} была ли панель открыта и закрыта.
   */
  function closeRightPanel() {
    const toggle = [...document.querySelectorAll('[data-sidebar-right-toggle]')]
      // Только та, что действительно на экране: кнопка существует и когда панель
      // разложена, но лежит за правым краем (x ≈ 670 при экране 360).
      .find((element) => onScreen(element))
    if (toggle === undefined) return false
    toggle.click()
    return true
  }

  /**
   * Закрыть правую панель, если в ней не осталось ни одной вкладки.
   *
   * Проверено: после закрытия последней вкладки (терминал) клиент оставляет панель
   * открытой пустой — ни гида «Начало», ни вкладок, только полноэкранная пустота
   * поверх чата. Новый гид клиент сам не сеет (и после перезагрузки тоже). Пустую
   * панель закрываем: человек возвращается в чат, а нужную поверхность открывает
   * обычной карточкой входа.
   */
  function closeEmptyRightPanel() {
    const toggle = [...document.querySelectorAll('[data-sidebar-right-toggle]')]
      .find((element) => onScreen(element, false))
    if (toggle === undefined) return
    if (document.querySelectorAll('[data-dockkit-tab]').length > 0) return
    const panel = document.querySelector('[data-sidebar-right-panel]')
    if (panel === null) return
    if ((panel.innerText || '').trim() !== '') return
    closeRightPanel()
  }

  /**
   * Системная кнопка «назад».
   *
   * Приложение не закрывает экран само: оно шлёт странице cancelable-событие
   * `dsh-mobile:native-back` и уходит только если никто не позвал preventDefault.
   * Мой слой это событие не слушал — и «назад» оставлял панель открытой вместе со
   * списком сессий (проверено: после нажатия drawer оставался true).
   */
  function bindBackButton() {
    window.addEventListener('dsh-mobile:native-back', (event) => {
      const panel = document.getElementById('dshm-remote-panel')
      if (panel !== null && getComputedStyle(panel).display !== 'none') {
        const scrim = document.getElementById('dshm-remote-scrim')
        if (scrim !== null) scrim.click()
        event.preventDefault()
        return
      }
      // Сетка инструментов закрывается раньше всего.
      if (document.querySelector('.dshm-grid') !== null) {
        closeToolGrid()
        event.preventDefault()
        return
      }
      // Поповер клиента (меню команд, выбор модели) закрывается первым: он
      // висит поверх содержимого и поверх правой панели.
      if (closeClientPopover()) {
        event.preventDefault()
        return
      }
      // Правая панель (файлы) закрывается следующей: она накрывает диалог.
      if (closeRightPanel()) {
        event.preventDefault()
        return
      }
      // Модальное окно клиента (настройки и подобные) закрывается своей кнопкой.
      if (closeClientModal()) {
        event.preventDefault()
        return
      }
      // Обычный диалог клиента («Переименовать сессию» и подобные) — кнопкой «Отмена».
      if (closeClientDialog()) {
        event.preventDefault()
        return
      }
      // Детальный экран (плагин, задача) возвращается сначала в свой список.
      if (closeClientDetail()) {
        event.preventDefault()
        return
      }
      // С вторичной страницы «назад» возвращает в диалог и открывает меню —
      // иначе человеку приходится искать кнопку меню заново.
      if (onSecondaryScreen() && returnToChat()) {
        event.preventDefault()
        return
      }
      if (document.documentElement.hasAttribute('data-dshm-drawer')) {
        closeDrawerLight()
        event.preventDefault()
        return
      }
      // В самом диалоге «назад» открывает боковое меню: это ожидаемый жест и
      // способ добраться до списка чатов, не поднимая палец к кнопке.
      setDrawer(true)
      event.preventDefault()
    })
  }

  /**
   * На телефоне в правой панели должна быть одна активная вкладка на всю ширину.
   *
   * Dockkit строит вкладки как grid: при двух открытых вкладках (гайд + разговор
   * субагента) получались две колонки по 180 px, и текст чата сжимался в полоску.
   * У клиента ширина колонок задана inline-стилем, поэтому CSS с !important
   * недостаточно надёжен — выставляем inline-important сами.
   */
  function singleColumnRightPanel() {
    if (innerWidth > 600) return
    /** Выставить inline-important только если значение реально меняется. */
    const set = (element, property, value) => {
      if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value, 'important')
    }
    for (const panel of document.querySelectorAll('[data-sidebar-right-panel]')) {
      for (const layout of panel.querySelectorAll('[class*="_tabLayout_"]')) {
        if (layout.style.getPropertyValue('grid-template-columns') !== '1fr') {
          set(layout, 'grid-template-columns', '1fr')
        }
      }
      // Одновременно «активными» могут быть несколько pane (старые вкладки
      // остаются смонтированными). Видимой должна быть только та ячейка, в
      // tab-strip которой выбран активный таб; иначе два заголовка складываются
      // друг на друга.
      const activeCells = [...panel.querySelectorAll('[class*="_tabCell_"]')]
        .filter((cell) => cell.querySelector('[data-dockkit-pane-active="true"]') !== null)
      const selected = activeCells.find((cell) => [...cell.querySelectorAll('[data-dockkit-tab]')]
        .some((tab) => String(tab.className).includes('_tabActive_')))
        ?? activeCells[activeCells.length - 1]
        ?? null
      for (const cell of panel.querySelectorAll('[class*="_tabCell_"]')) {
        const isActive = cell === selected
        set(cell, 'display', isActive ? 'block' : 'none')
        if (isActive) {
          set(cell, 'grid-area', '1 / 1 / 2 / 2')
          set(cell, 'width', '100%')
          // Cell height must stay inside the panel: otherwise _tabHostBody_
          // раскрывается на 3000+ px, панель обрезает его, а внутренний scroll
          // остаётся нулевой высоты — чат нельзя пролистать.
          set(cell, 'height', '100%')
          set(cell, 'max-height', '100%')
          set(cell, 'overflow', 'hidden')
          const host = cell.querySelector('[class*="_tabHost_"]')
          if (host !== null) {
            set(host, 'height', '100%')
            set(host, 'max-height', '100%')
            set(host, 'display', 'flex')
            set(host, 'flex-direction', 'column')
            set(host, 'overflow', 'hidden')
          }
          const hostBody = cell.querySelector('[class*="_tabHostBody_"]')
          if (hostBody !== null) {
            set(hostBody, 'flex', '1 1 auto')
            set(hostBody, 'min-height', '0')
            set(hostBody, 'height', 'auto')
            set(hostBody, 'overflow-y', 'auto')
            // Панель тянется под системную навигацию; оставляем нижний отступ,
            // чтобы композер и последние строки не уезжали под кнопки Android.
            set(hostBody, 'padding-bottom', 'calc(env(safe-area-inset-bottom) + .5rem)')
            set(hostBody, 'box-sizing', 'border-box')
          }
        }
      }
      // Разделитель между колонками на телефоне не нужен.
      for (const divider of panel.querySelectorAll('[class*="_tabLayoutDivider_"]')) {
        set(divider, 'display', 'none')
      }
    }
  }

  /**
   * Следить за правой панелью по её стабильным data-атрибутам, а не по тексту
   * aria-label: подписи переводятся, и русская проверка ломалась бы в en/zh.
   * Состояние читаем из DOM после клика: `data-sidebar-right-open` есть, пока
   * панель развёрнута.
   */
  function trackRightPanel() {
    if (document.documentElement.hasAttribute('data-dshm-right-tracked')) return
    document.documentElement.setAttribute('data-dshm-right-tracked', '')
    const sync = () => {
      rightPanelVisible = document.querySelector('[data-sidebar-right-open]') !== null
      if (rightPanelVisible) singleColumnRightPanel()
      if (rightPanelVisible && document.documentElement.hasAttribute('data-dshm-drawer')) closeDrawerLight()
    }
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element
        ? event.target.closest('[data-sidebar-right-expand], [data-sidebar-right-toggle], [data-sidebar-right-mode], [data-sidebar-right-panel] button')
        : null
      if (target === null) return
      window.setTimeout(sync, 0)
    }, true)
    // Панель могли восстановить открытой после перезагрузки — прочитать сразу.
    window.setTimeout(sync, 300)
  }

  function closeOnNavigate() {
    const column = document.querySelector(':is([class$="_sidebarCol"], [class*="_sidebarCol "])')
    if (column === null || column.hasAttribute('data-dshm-bound')) return
    column.setAttribute('data-dshm-bound', '')
    column.addEventListener('click', (event) => {
      if (Date.now() < suppressCloseUntil) return
      const target = event.target instanceof Element ? event.target.closest('button, a, [role=treeitem]') : null
      if (target === null) return
      const label = (target.getAttribute('aria-label') || '').trim()
      if (/^(Поиск сессий|Добавить рабочую область|Настройки)$/u.test(label)) return
      // «Вы вошли в DeepSeek» открывает настройки модалкой. Панель при этом не
      // должна сворачиваться: человек вернётся из настроек в ту же панель.
      if (/учётной записи|account menu|账号菜单/iu.test(label)) return
      // Внутренние действия списка не уводят с экрана: группа рабочей области
      // раскрывается/сворачивается, «Показать ещё» догружает строки — меню
      // должно остаться открытым. Раньше любое такое касание закрывало его, и
      // человек терял место, до которого листал.
      if (target.closest('[role=treeitem][aria-expanded]') !== null) return
      if (target.closest(':is([class$="_sessionOverflowButton"], [class*="_sessionOverflowButton "])') !== null) return
      // Переход в другой экран не должен поднимать клавиатуру: клиент фокусирует
      // композер при открытии сессии, и это выглядит как моргнувшая клавиатура.
      suppressAutofocus()
      setTimeout(closeDrawerLight, 120)
      scheduleBlur([300, 900, 1800])
    })
  }

  /** Закрыть боковую панель клавишей Escape — привычный жест на телефоне с клавиатурой. */
  function bindEscapeClose() {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.documentElement.hasAttribute('data-dshm-drawer')) {
        closeDrawer()
        event.preventDefault()
      }
    })
  }

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

  /* ── 6. НАБЛЮДЕНИЕ ЗА СТРАНИЦЕЙ: СТАТИСТИКА ХОДА ───────────────────────
   * Один тикер вместо пяти: каждый проход делает срочное, а редкое — по
   * счётчику. Частый полный обход DOM на длинной переписке давал кадры по
   * 58–117 мс, поэтому строку статистики ищем в доке композера, а не по всей
   * странице.
   */

  /**
   * Держать страницу в порядке.
   *
   * Клиент при запуске может помнить раскрытую панель, и тогда она накрывает экран
   * телефона при каждом открытии. Один раз при старте приводим её в закрытое состояние —
   * дальше состоянием управляем мы.
   */
  function watch() {
    trackRightPanel()
    let closedOnce = false
    const tick = () => {
      // Панель могла восстановиться открытой без клика; держим одну колонку.
      singleColumnRightPanel()
      markStats()
      // Ящик мог открыться до отрисовки колонки или остаться после перехода.
      // Пустую панель закрываем; поле поиска внутри ящика не трогаем.
      if (drawerOpen && Date.now() - drawerOpenedAt > 700 && !hasSidebarContent()
        && document.activeElement?.closest(':is([class$="_sidebarCol"], [class*="_sidebarCol "])') === null) {
        closeDrawerLight()
      }
      if (!closedOnce && !drawerOpen && document.documentElement.hasAttribute('data-dshm-drawer')) {
        document.documentElement.removeAttribute('data-dshm-drawer')
      }
      closedOnce = true
    }
    // Пока человек ни к чему не прикасался, клавиатуру не показываем.
    //
    // Клиент при загрузке ставит фокус в поле ввода, и приложение открывается сразу с
    // поднятой клавиатурой — для человека это выглядит как «приложение само начало
    // печатать». Любое касание снимает это правило: дальше решает он.
    let userTouched = false
    const markTouched = () => { userTouched = true }
    for (const type of ['pointerdown', 'touchstart', 'keydown']) {
      window.addEventListener(type, markTouched, { once: true, capture: true, passive: true })
    }
    // Пустой ящик не должен висеть на экране даже один тик: проверяем часто,
    // пока он открыт, и закрываем, как только содержимое пропало.
    const drawerGuard = setInterval(() => {
      if (!drawerOpen || Date.now() - drawerOpenedAt <= 250) return
      if (hasSidebarContent()) return
      if (document.activeElement?.closest(':is([class$="_sidebarCol"], [class*="_sidebarCol "])') !== null) return
      closeDrawerLight()
    }, 250)
    const focusGuard = setInterval(() => {
      if (userTouched) {
        clearInterval(focusGuard)
        return
      }
      const active = document.activeElement
      if (isTextEntry(active)) active.blur()
    }, 300)
    // Один тикер вместо пяти: каждый проход делает срочное, а редкое — по счётчику.
    //
    // Было: 800 мс (пометки/вопросы/завершение/карточка плана), 1500 мс
    // (closeOnNavigate — на самом деле одноразовая привязка обработчика, его
    // достаточно вызвать при старте), 2500 мс (убрать настольные кнопки),
    // 1200 мс (панель клиента), 1200 мс (строка «Продолжить»). Каждый обход — это
    // поиск по всему DOM, и на длинной переписке они складывались.
    let passes = 0
    setInterval(() => {
      if (paused()) return
      tick()
      notifyQuestion()
      watchCompletion()
      keepPlanCardVisible()
      closeEmptyRightPanel()
      passes += 1
      if (passes % 2 === 0) {
        // closeOnNavigate вешает обработчик на колонку клиента; после перерисовки
        // колонка может замениться, поэтому привязку проверяем периодически.
        closeOnNavigate()
        keepClientPanelOpen()
        rememberBar()
      }
      if (passes % 4 === 0) hideLegacyMobileAccess()
    }, 800)
    blurOnButtonClick()
    installTerminalKeyboard()
    installQuestionEnterNewline()
    tick()
  }

  /**
   * Пометить строку статистики хода (токены/с, попадание в кэш).
   *
   * Раньше здесь был полный обход `div, p, span` всей страницы с чтением
   * `getBoundingClientRect` у каждого кандидата — каждые 800 мс, и это давало
   * редкие кадры по 58–117 мс на длинной переписке (замер с выключенными
   * таймерами слоя: 42 мс против 117). Строка живёт в доке композера: девять
   * узлов вместо тысяч, и английский шаблон заменён на оба языка — русский
   * интерфейс раньше не помечался вовсе.
   */
  /**
   * Закрыть нижнюю шторку клиента (команда агентов/субагенты/фоновые задачи).
   *
   * Клиент закрывает такие панели по Escape; кнопка «×» в шторке делает то же.
   */
  function closeToolSheet() {
    const sheet = document.querySelector('[data-dshm-sheet]')
    if (sheet !== null) {
      const dispatchEscape = () => sheet.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true,
      }))
      dispatchEscape()
      sheet.removeAttribute('data-dshm-sheet')
      sheet.querySelectorAll('.dshm-sheet-close, .dshm-sheet-handle').forEach((element) => element.remove())
      for (const scrim of document.querySelectorAll('.dshm-sheet-scrim')) {
        scrim.dataset.dshmShow = '0'
        window.setTimeout(() => scrim.remove(), 220)
      }
      // Страховка: некоторые панели клиента не слушают Escape. Тогда закрываем
      // их собственной кнопкой, чтобы шторка не осталась висеть.
      window.setTimeout(() => {
        if (!sheet.isConnected) return
        const close = sheet.querySelector('[class*="_close"], button[aria-label*="Закрыть"], button[aria-label*="Close"]')
        if (close !== null) close.click()
      }, 120)
    }
    for (const button of document.querySelectorAll('.dshm-tool[aria-expanded="true"]')) {
      button.setAttribute('aria-expanded', 'false')
    }
  }

  /**
   * Найти панель клиента, которую только что открыла скрытая кнопка, и превратить
   * её в нижнюю шторку: выпадашка привязана к кнопке в скрытой шапке и рисуется в
   * левом верхнем углу без прокрутки.
   *
   * @param {Element} source скрытая кнопка шапки.
   * @param {Element} tool наша кнопка панели.
   */
  function markToolSheet(source, tool) {
    // Модуль клиента по хешу класса: кнопка `_2tNPVa_trigger` открывает панель
    // `_2tNPVa_panel`, `Z0Zh9q_trigger` — меню `Z0Zh9q_menu`. Так мы никогда не
    // примем за шторку уже открытую правую панель или чужой диалог.
    const firstClass = (String(source.className).split(/\s+/u)[0] ?? '').replace(/^_/u, '')
    const modulePrefix = firstClass.split('_')[0]
    const snapshot = new Set(document.querySelectorAll('[role=dialog], [class*="_menu"], [class*="_panel"]'))
    const pool = modulePrefix === ''
      ? '[role=dialog], [class*="_menu"], [class*="_panel"]'
      : `[role=dialog], [class*="${modulePrefix}"], [class*="_menu"], [class*="_panel"]`
    const ours = (element) => element.closest('[class*="_composerStack"]') !== null
      || element.closest('[class*="_sidebarCol"]') !== null
      || element.closest('[data-sidebar-right-panel]') !== null
      || element.closest('[class*="tabHost"]') !== null
      || element.closest('[data-queue-dock]') !== null
      || element.closest('[data-shortcut-modal]') !== null
    source.click()
    window.setTimeout(() => {
      const candidates = [...document.querySelectorAll(pool)]
        .filter((element) => {
          if (element.hasAttribute('data-dshm-sheet')) return false
          if (ours(element)) return false
          const className = String(element.className)
          const isNew = !snapshot.has(element)
          const sameModule = modulePrefix !== '' && className.includes(modulePrefix)
          // Модульный хеш — предпочтительный признак; если клиент сменил хеш,
          // спасает сравнение «что появилось после клика».
          if (!isNew && !sameModule) return false
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return rect.width > 200 && rect.height > 60 && rect.bottom > 0 && rect.top < window.innerHeight
            && (style.position === 'fixed' || style.position === 'absolute')
        })
        .sort((a, b) => (Number(String(b.className).includes(modulePrefix)) - Number(String(a.className).includes(modulePrefix))))
      const sheet = candidates[0]
      if (sheet === undefined) return
      sheet.setAttribute('data-dshm-sheet', '')
      sheet.dataset.dshmSheetToken = SHEET_TOKEN
      const scrim = document.createElement('div')
      scrim.className = 'dshm-sheet-scrim'
      scrim.dataset.dshmShow = '0'
      scrim.addEventListener('click', closeToolSheet)
      document.body.appendChild(scrim)
      window.requestAnimationFrame(() => { scrim.dataset.dshmShow = '1' })
      const close = document.createElement('button')
      close.type = 'button'
      close.className = 'dshm-sheet-close'
      close.setAttribute('aria-label', tr('Закрыть'))
      close.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        closeToolSheet()
      })
      sheet.appendChild(close)
      const handle = document.createElement('div')
      handle.className = 'dshm-sheet-handle'
      sheet.appendChild(handle)
      let dragStart = null
      let dragY = 0
      handle.addEventListener('pointerdown', (event) => {
        dragStart = event.clientY
        dragY = 0
        sheet.style.transition = 'none'
        handle.setPointerCapture?.(event.pointerId)
      })
      handle.addEventListener('pointermove', (event) => {
        if (dragStart === null) return
        dragY = Math.max(0, event.clientY - dragStart)
        sheet.style.transform = `translateY(${String(dragY)}px)`
        const sheetScrim = document.querySelector('.dshm-sheet-scrim')
        if (sheetScrim !== null) sheetScrim.style.opacity = String(Math.max(0.1, 1 - dragY / 260))
      })
      const endDrag = () => {
        if (dragStart === null) return
        dragStart = null
        if (dragY > 110) {
          sheet.style.transition = 'transform .18s ease-in'
          sheet.style.transform = 'translateY(110%)'
          const sheetScrim = document.querySelector('.dshm-sheet-scrim')
          if (sheetScrim !== null) sheetScrim.style.opacity = '0'
          window.setTimeout(closeToolSheet, 180)
        } else {
          sheet.style.transition = 'transform .28s cubic-bezier(.2,1.15,.3,1)'
          sheet.style.transform = ''
          const sheetScrim = document.querySelector('.dshm-sheet-scrim')
          if (sheetScrim !== null) sheetScrim.style.opacity = ''
        }
        dragY = 0
      }
      handle.addEventListener('pointerup', endDrag)
      handle.addEventListener('pointercancel', endDrag)
      tool.setAttribute('aria-expanded', 'true')
    }, 140)
  }

  /**
   * Создать кнопку нижней панели, которая открывает скрытую кнопку шапки шторкой.
   *
   * @param {string} key стабильный ключ кнопки.
   * @param {RegExp} ariaPattern поиск скрытой кнопки шапки по aria-label.
   * @param {string} label подпись/aria для нашей кнопки.
   * @param {string} svg иконка.
   * @param {Element} dock контейнер нижней панели.
   * @returns {Element|undefined} созданная кнопка.
   */
  function createToolButton(key, ariaPattern, label, svg, dock) {
    const existing = dock.querySelector(`[data-dshm-tool="${key}"]`)
    const findSource = () => [...document.querySelectorAll('button')]
      .find((candidate) => !candidate.classList.contains('dshm-tool')
        && ariaPattern.test(candidate.getAttribute('aria-label') ?? ''))
    const source = findSource()
    if (existing !== null) {
      // Кнопка, у которой больше нет исходной кнопки клиента, — мёртвая. Но
      // источник может исчезнуть на время анимации ящика/диалога: не дёргаем DOM
      // каждый тик, а убираем кнопку после нескольких подряд пропусков. Иначе
      // открытие панели само создаёт длинные задачи (замер: десятки long tasks).
      if (source !== undefined) {
        delete existing.dataset.dshmMissing
        return existing
      }
      const misses = Number(existing.dataset.dshmMissing ?? 0) + 1
      existing.dataset.dshmMissing = String(misses)
      if (misses < 5) return existing
      existing.remove()
    }
    if (source === undefined) return undefined
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.dshmTool = key
    button.className = 'dshm-tool'
    button.setAttribute('aria-label', findSource()?.getAttribute('aria-label') || label)
    button.title = label
    button.innerHTML = svg
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      tapHaptic()
      if (button.getAttribute('aria-expanded') === 'true') {
        closeToolSheet()
        return
      }
      closeToolSheet()
      const source = findSource()
      if (source === undefined) return
      markToolSheet(source, button)
    })
    dock.appendChild(button)
    return button
  }

  /**
   * Короткий тактильный отклик на нажатие инструмента.
   *
   * Сначала пробуем нативный мост (`haptic.tap`), иначе Vibration API. Наличие
   * возможности кешируем, чтобы не опрашивать мост на каждое касание.
   */
  let nativeHaptic = null

  function tapHaptic() {
    const bridge = window.__DSH_MOBILE_NATIVE__
    if (bridge !== undefined && typeof bridge.invoke === 'function') {
      if (nativeHaptic === null && typeof bridge.capabilities === 'function') {
        bridge.capabilities().then((caps) => {
          nativeHaptic = Array.isArray(caps) && caps.includes('haptic.tap')
        }).catch(() => { nativeHaptic = false })
      }
      if (nativeHaptic === true) {
        try {
          const result = bridge.invoke('haptic.tap', { duration: 8 })
          if (result !== undefined && typeof result.catch === 'function') result.catch(() => { nativeHaptic = false })
          return
        } catch { nativeHaptic = false }
      }
    }
    if (navigator.vibrate) navigator.vibrate(6)
  }

  /** Ключ закрепления для источника сетки ('' — источник не закрепляется). */
  const PIN_KEY = 'dshm.dockPinned'

  /** Прочитать закреплённые инструменты из localStorage. */
  function readPinned() {
    try {
      const value = JSON.parse(localStorage.getItem(PIN_KEY) || '[]')
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
    } catch { return [] }
  }

  /** Записать закреплённые инструменты. */
  function writePinned(list) {
    try { localStorage.setItem(PIN_KEY, JSON.stringify(list)) } catch {}
  }

  /**
   * Переключить закрепление инструмента.
   *
   * @param {string} key ключ.
   * @returns {string[]} новый список.
   */
  function togglePinned(key) {
    const list = readPinned()
    const index = list.indexOf(key)
    if (index >= 0) list.splice(index, 1)
    else list.push(key)
    writePinned(list)
    return list
  }

  /**
   * Найти именно док композера.
   *
   * В `composerStack` бывает несколько доков: InputBar (data-composer-dock),
   * GoalBar (data-goal-bar, только при активной цели) и QueueDock (data-queue-dock,
   * только при непустой очереди). Раньше брали первый `:is([class$="_dock"], [class*="_dock "])` и при
   * активной цели вставляли кнопки в чужой бар — двойная реализация панели.
   *
   * @returns {Element|null} док композера.
   */
  function composerDock() {
    // В правой панели бывает встроенный разговор со своим composer-dock.
    // Выбираем док активной поверхности, а не первый в документе: иначе слой
    // вставляет кнопки в скрытый основной чат и проверки видят «два дока».
    const docks = [...document.querySelectorAll('[data-composer-dock="true"]')]
    if (docks.length > 0) {
      // Активной панель считаем только когда она реально открыта. После закрытия
      // dockkit оставляет её DOM (и встроенный composer-dock) в документе; если
      // брать его всегда, слой переносит инструменты в скрытую панель, а в
      // основном чате остаются стандартные кнопки.
      const activePanel = document.querySelector('[data-sidebar-right-open]') === null
        ? null
        : document.querySelector('[data-sidebar-right-panel] [data-dockkit-pane-active="true"]')
      let exact = activePanel === null
        ? undefined
        : docks.find((dock) => activePanel.contains(dock))
      if (exact === undefined) {
        exact = docks.find((dock) => visible(dock) && dock.closest('[data-sidebar-right-panel]') === null)
          ?? docks.find((dock) => visible(dock))
          ?? docks[0]
      }
      return exact
    }
    const fallback = [...document.querySelectorAll('[class*="_composerStack"] :is([class$="_dock"], [class*="_dock "])')]
      .find((element) => !element.hasAttribute('data-queue-dock') && !element.hasAttribute('data-goal-bar'))
    if (fallback === undefined) return null
    fallback.setAttribute('data-dshm-composer-dock', '')
    return fallback
  }

  /**
   * Записать data-атрибут только если значение реально меняется.
   *
   * Тикер ходит каждые 800 мс; запись того же значения — лишняя мутация DOM,
   * лишний ResizeObserver/React-шум и риск гонок. Особенно заметно на
   * data-dshm-collapsed/context/dock-hidden.
   *
   * @param {Element} element элемент.
   * @param {string} name имя dataset-ключа.
   * @param {string|null} value новое значение; null — удалить.
   */
  function setAttrIfChanged(element, name, value) {
    if (value === null) {
      if (element.hasAttribute(name)) element.removeAttribute(name)
      return
    }
    if (element.getAttribute(name) !== value) element.setAttribute(name, value)
  }

  /**
   * Убрать наши кнопки и состояние из чужих доков (цель/очередь), если старый слой
   * успел их туда вставить.
   *
   * @param {Element} dock настоящий док композера.
   */
  function cleanupForeignDocks(dock) {
    for (const foreign of document.querySelectorAll(':is([class$="_dock"], [class*="_dock "])')) {
      if (foreign === dock) continue
      foreign.querySelectorAll('.dshm-tool, .dshm-dock-toggle, [data-dshm-grid]').forEach((element) => element.remove())
      for (const name of ['dshmScroll', 'dshmCollapsed', 'dshmDragging', 'dshmBound', 'dshmEnter', 'dshmSeen', 'dshmTips', 'dshmDragBound', 'dshmReady', 'dshmTouched']) {
        delete foreign.dataset[name]
      }
    }
  }

  /** Ключ скрытых из дока инструментов. */
  const HIDDEN_KEY = 'dshm.dockHidden'

  /** Прочитать скрытые из дока инструменты. */
  function readHidden() {
    try {
      const value = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
    } catch { return [] }
  }

  /** Записать скрытые из дока инструменты. */
  function writeHidden(list) {
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(list)) } catch {}
  }

  /** Ключ инструмента для скрытия/показа: стат-кнопки тоже участвуют. */
  function dockKey(source) {
    const key = sourceKey(source)
    if (key !== '') return key
    const aria = (source.getAttribute('aria-label') || '').trim()
    if (/^Ходов|Turns\b/iu.test(aria)) return 'stat:activity'
    if (/токен|oken/iu.test(aria)) return 'stat:tokens'
    if (/контекст|context/iu.test(aria)) return 'stat:context'
    return ''
  }

  /** Ключ «док свёрнут». */
  const COLLAPSED_KEY = 'dshm.dockCollapsed'

  /** Прочитать состояние «док свёрнут». */
  function readCollapsed() {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1' } catch { return false }
  }

  /** Записать состояние «док свёрнут». */
  function writeCollapsed(value) {
    try { localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0') } catch {}
  }

  /** Ключ сохранённого порядка дока. */
  const ORDER_KEY = 'dshm.dockOrder'

  /** Прочитать сохранённый порядок инструментов. */
  function readOrder() {
    try {
      const value = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]')
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
    } catch { return [] }
  }

  /** Записать порядок инструментов. */
  function writeOrder(list) {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(list)) } catch {}
  }

  /** Ключ источника для сетки/закрепления. */
  function sourceKey(source) {
    if (source.dataset.dshmTool !== undefined) return source.dataset.dshmTool
    if (source.dataset.dshmAction !== undefined) return source.dataset.dshmAction
    return ''
  }

  /**
   * Короткая подпись для плитки сетки инструментов.
   *
   * @param {Element} source кнопка дока или клиента.
   * @returns {string} подпись.
   */
  function toolLabel(source) {
    const aria = (source.getAttribute('aria-label') || source.title || '').trim()
    if (/^(Ходов|Turns)[:\s]/iu.test(aria)) return tr('Статистика')
    if (/субагент|subagent/iu.test(aria)) return tr('Субагенты')
    if (/фоновая задача|background task/iu.test(aria)) return tr('Фоновые задачи')
    if (/токен|oken/i.test(aria)) return tr('Токены')
    if (/контекст|context/i.test(aria)) return tr('Контекст')
    return aria.length > 28 ? `${aria.slice(0, 27)}…` : aria
  }

  /** Токен экземпляра слоя: помечает шторки, созданные именно этим слоем. */
  const SHEET_TOKEN = `${String(Date.now())}-${String(Math.random()).slice(2, 8)}`

  /** Показывался ли брифинг в этой загрузке страницы. */
  let onboardingShown = false

  /**
   * Показать короткий брифинг первого запуска.
   *
   * @param {boolean} force показать заново, даже если уже видели.
   */
  function showOnboarding(force = false) {
    if (!force) {
      if (onboardingShown || document.querySelector('.dshm-onboard') !== null) return
      try { if (localStorage.getItem('dshm.onboardingSeen') === '1') return } catch { return }
    } else {
      document.querySelector('.dshm-onboard')?.remove()
    }
    onboardingShown = true
    const steps = [
      { icon: '⌘', title: 'DDeck — это ваш компьютер', text: 'Чаты, файлы, терминал и настройки работают на Mac. Телефон только показывает и управляет.' },
      { icon: '⋯', title: 'Нижняя панель — быстрые инструменты', text: 'Листайте её влево-вправо. Кнопка с точками открывает все инструменты; свайп вверх по панели делает то же самое.' },
      { icon: '☑', title: 'Соберите панель под себя', text: 'В сетке нажмите «Изменить» и коснитесь плитки: инструмент убирается из панели или возвращается. Лишние остаются в меню.' },
      { icon: '↔', title: 'Порядок и управление', text: 'Долгое нажатие на иконке — перетащить. Шеврон справа сворачивает панель. Настройки — «Вы вошли в DeepSeek».' },
    ]
    let step = 0
    const overlay = document.createElement('div')
    overlay.className = 'dshm-onboard'
    overlay.dataset.dshmShow = '0'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', tr('Как пользоваться DDeck'))
    const card = document.createElement('div')
    card.className = 'dshm-onboard-card'
    const icon = document.createElement('div')
    icon.className = 'dshm-onboard-icon'
    const title = document.createElement('div')
    title.className = 'dshm-onboard-title'
    const text = document.createElement('p')
    text.className = 'dshm-onboard-text'
    const foot = document.createElement('div')
    foot.className = 'dshm-onboard-foot'
    const dots = document.createElement('div')
    dots.className = 'dshm-onboard-dots'
    const actions = document.createElement('div')
    actions.className = 'dshm-onboard-actions'
    const skip = document.createElement('button')
    skip.type = 'button'
    skip.className = 'dshm-onboard-skip'
    skip.textContent = tr('Пропустить')
    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'dshm-onboard-next'
    actions.append(skip, next)
    foot.append(dots, actions)
    card.append(icon, title, text, foot)
    overlay.append(card)

    const finish = () => {
      try { localStorage.setItem('dshm.onboardingSeen', '1') } catch {}
      overlay.dataset.dshmShow = '0'
      window.setTimeout(() => overlay.remove(), 220)
    }
    const render = () => {
      const current = steps[step]
      icon.textContent = current.icon
      title.textContent = tr(current.title)
      text.textContent = tr(current.text)
      dots.replaceChildren(...steps.map((_, index) => {
        const dot = document.createElement('span')
        dot.className = 'dshm-onboard-dot'
        if (index === step) dot.dataset.dshmActive = '1'
        return dot
      }))
      next.textContent = step === steps.length - 1 ? tr('Понятно') : tr('Далее')
      skip.textContent = step === steps.length - 1 ? tr('Закрыть') : tr('Пропустить')
    }
    skip.addEventListener('click', finish)
    next.addEventListener('click', () => {
      if (step === steps.length - 1) {
        finish()
        return
      }
      step += 1
      render()
    })
    render()
    document.body.appendChild(overlay)
    window.requestAnimationFrame(() => { overlay.dataset.dshmShow = '1' })
  }

  /** Закрыть сетку инструментов. */
  function closeToolGrid() {
    const grid = document.querySelector('.dshm-grid')
    const scrim = document.querySelector('.dshm-grid-scrim')
    if (grid !== null) grid.dataset.dshmShow = '0'
    if (scrim !== null) scrim.dataset.dshmShow = '0'
    window.setTimeout(() => {
      grid?.remove()
      scrim?.remove()
    }, 220)
  }

  /**
   * Открыть сетку всех инструментов: док листается, а сетка показывает всё сразу.
   */
  function openToolGrid() {
    if (document.querySelector('.dshm-grid') !== null) {
      closeToolGrid()
      return
    }
    const dock = composerDock()
    if (dock === null) return
    const scrim = document.createElement('div')
    scrim.className = 'dshm-grid-scrim'
    scrim.dataset.dshmShow = '0'
    scrim.addEventListener('click', closeToolGrid)
    const grid = document.createElement('div')
    grid.className = 'dshm-grid'
    grid.setAttribute('role', 'dialog')
    grid.setAttribute('aria-label', tr('Все инструменты'))
    grid.dataset.dshmShow = '0'
    const header = document.createElement('div')
    header.className = 'dshm-grid-header'
    const title = document.createElement('div')
    title.className = 'dshm-grid-title'
    title.textContent = tr('Инструменты')
    const edit = document.createElement('button')
    edit.type = 'button'
    edit.className = 'dshm-grid-edit'
    edit.textContent = tr('Изменить')
    edit.setAttribute('aria-label', tr('Настройка нижней панели'))
    const reset = document.createElement('button')
    reset.type = 'button'
    reset.className = 'dshm-grid-edit dshm-grid-reset'
    reset.textContent = tr('Сбросить')
    reset.setAttribute('aria-label', tr('Вернуть все инструменты в панель'))
    reset.dataset.dshmHidden = '1'
    edit.addEventListener('click', () => {
      const active = grid.dataset.dshmEdit === '1'
      grid.dataset.dshmEdit = active ? '0' : '1'
      edit.dataset.dshmActive = active ? '0' : '1'
      edit.textContent = active ? tr('Изменить') : tr('Готово')
      reset.dataset.dshmHidden = active ? '1' : '0'
    })
    reset.addEventListener('click', () => {
      writeHidden([])
      for (const cell of grid.querySelectorAll('.dshm-grid-cell')) {
        cell.dataset.dshmDockHidden = '0'
      }
    })
    const info = document.createElement('button')
    info.type = 'button'
    info.className = 'dshm-grid-info'
    info.setAttribute('aria-label', tr('Как пользоваться'))
    info.textContent = '?'
    info.addEventListener('click', () => {
      closeToolGrid()
      window.setTimeout(() => showOnboarding(true), 120)
    })
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'dshm-grid-close'
    close.setAttribute('aria-label', tr('Закрыть'))
    close.textContent = '×'
    close.addEventListener('click', closeToolGrid)
    header.append(title, edit, reset, info, close)
    const search = document.createElement('input')
    search.className = 'dshm-grid-search'
    search.type = 'search'
    search.placeholder = tr('Поиск инструмента')
    search.setAttribute('aria-label', tr('Поиск инструмента'))
    const cells = document.createElement('div')
    cells.className = 'dshm-grid-cells'

    const sources = [
      ...[...dock.querySelectorAll('button')].filter((button) => button.dataset.dshmTool === undefined
        && button.dataset.dshmAction === undefined && button.dataset.dshmGrid === undefined
        && !button.classList.contains('dshm-dock-toggle')),
      ...[...dock.querySelectorAll('[data-dshm-tool], [data-dshm-action]')],
    ]
    const synonyms = uiLang() === 'en'
      ? {
          menu: 'sidebar sessions drawer',
          newSession: 'new chat session',
          search: 'search find',
          plugins: 'plugins extensions',
          tasks: 'automations schedule tasks',
          files: 'files terminal right panel',
          agents: 'agent team agents',
          subagents: 'subagents agents',
          jobs: 'background tasks jobs',
        }
      : {
          menu: 'сессии ящик боковая панель',
          newSession: 'новый чат сессия',
          search: 'поиск найти',
          plugins: 'плагины расширения',
          tasks: 'автозадачи расписание автоматические',
          files: 'файлы терминал правая панель',
          agents: 'команда агентов команда',
          subagents: 'субагенты агенты',
          jobs: 'фоновые задачи фон',
        }
    const hidden = readHidden()
    for (const source of sources) {
      const key = dockKey(source)
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'dshm-grid-cell'
      cell.dataset.dshmKey = key
      cell.dataset.dshmPinnable = key === '' ? '0' : '1'
      const label = toolLabel(source)
      const extra = key === '' ? '' : (synonyms[key] ?? '')
      cell.dataset.dshmLabel = `${label} ${extra}`.toLowerCase()
      cell.dataset.dshmDockHidden = key !== '' && hidden.includes(key) ? '1' : '0'
      const icon = source.querySelector('svg')
      if (icon !== null) cell.appendChild(icon.cloneNode(true))
      const labelElement = document.createElement('span')
      labelElement.textContent = label
      cell.appendChild(labelElement)
      cell.addEventListener('click', () => {
        tapHaptic()
        if (grid.dataset.dshmEdit === '1') {
          if (cell.dataset.dshmPinnable !== '1') return
          const list = readHidden()
          const index = list.indexOf(key)
          if (index >= 0) list.splice(index, 1)
          else list.push(key)
          writeHidden(list)
          cell.dataset.dshmDockHidden = list.includes(key) ? '1' : '0'
          return
        }
        closeToolGrid()
        window.setTimeout(() => source.click(), 120)
      })
      cells.appendChild(cell)
    }
    if (cells.children.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'dshm-grid-empty'
      empty.textContent = tr('Инструменты появятся, когда откроется чат')
      cells.appendChild(empty)
    }
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase()
      for (const cell of cells.querySelectorAll('.dshm-grid-cell')) {
        cell.dataset.dshmHidden = query !== '' && !cell.dataset.dshmLabel.includes(query) ? '1' : '0'
      }
    })
    grid.append(header, search, cells)
    document.body.append(scrim, grid)
    window.requestAnimationFrame(() => {
      scrim.dataset.dshmShow = '1'
      grid.dataset.dshmShow = '1'
    })
  }

  /**
   * Долгое нажатие с перетаскиванием: инструменты дока можно менять местами.
   *
   * Короткое нажатие остаётся нажатием, горизонтальный свайп — обычная прокрутка.
   * После удержания 300 мс кнопка «приподнимается», движение меняет порядок, отпускание
   * сохраняет его в localStorage.
   *
   * @param {Element} dock контейнер дока.
   */
  function bindDockDrag(dock) {
    if (dock.dataset.dshmDragBound === '1') return
    dock.dataset.dshmDragBound = '1'
    // Android WebView открывает меню выделения/контекстное меню на долгом
    // нажатии и отбирает жест — перетаскивание не начиналось. Гасим его.
    dock.addEventListener('contextmenu', (event) => event.preventDefault(), { capture: true })
    let candidate = null
    let dragging = null
    let timer = 0
    let startX = 0
    let startY = 0
    let suppressClickUntil = 0
    // Горизонтальная прокрутка дока: touch-action:none нужен для долгого
    // нажатия/перетаскивания, поэтому прокрутку ведём вручную, с инерцией.
    let scrolling = false
    let lastX = 0
    let velocity = 0
    let momentumFrame = 0

    /** Все переставляемые кнопки, кроме несъёмной сетки. */
    const movable = () => [...dock.querySelectorAll('[data-dshm-tool], [data-dshm-action]')]
      .filter((button) => !button.hasAttribute('data-dshm-grid'))

    const stopMomentum = () => {
      if (momentumFrame !== 0) {
        window.cancelAnimationFrame(momentumFrame)
        momentumFrame = 0
      }
    }
    const startMomentum = () => {
      stopMomentum()
      const step = () => {
        momentumFrame = 0
        if (Math.abs(velocity) < 0.5) return
        dock.scrollLeft += velocity
        velocity *= 0.92
        momentumFrame = window.requestAnimationFrame(step)
      }
      if (Math.abs(velocity) >= 0.5) momentumFrame = window.requestAnimationFrame(step)
    }

    const finish = () => {
      window.clearTimeout(timer)
      if (scrolling) startMomentum()
      scrolling = false
      edgeDirection = 0
      if (edgeFrame !== 0) {
        window.cancelAnimationFrame(edgeFrame)
        edgeFrame = 0
      }
      if (dragging !== null) {
        dragging.classList.remove('dshm-dragging')
        dock.dataset.dshmDragging = '0'
        dock.style.touchAction = ''
        writeOrder(movable().map((button) => sourceKey(button)).filter((key) => key !== ''))
        suppressClickUntil = Date.now() + 350
      }
      candidate = null
      dragging = null
    }

    dock.addEventListener('pointerdown', (event) => {
      stopMomentum()
      scrolling = false
      velocity = 0
      const target = event.target instanceof Element ? event.target.closest('[data-dshm-tool], [data-dshm-action]') : null
      if (target === null || target.hasAttribute('data-dshm-grid')) return
      candidate = target
      startX = event.clientX
      startY = event.clientY
      lastX = event.clientX
      // Захват указателя: движение продолжает приходить в док, даже если палец
      // ушёл за пределы кнопки/контейнера.
      try { target.setPointerCapture(event.pointerId) } catch { /* старые WebView */ }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (candidate === null) return
        stopMomentum()
        dragging = candidate
        tapHaptic()
        dragging.classList.add('dshm-dragging')
        dock.dataset.dshmDragging = '1'
        dock.style.touchAction = 'none'
        for (const tip of document.querySelectorAll('.dshm-tip')) tip.dataset.dshmShow = '0'
      }, 250)
    }, { passive: true })

    /** Переставить перетаскиваемую кнопку под координату x с FLIP-анимацией соседей. */
    const reorderAt = (x) => {
      const order = movable()
      const before = new Map(order.map((button) => [button, button.getBoundingClientRect()]))
      const target = order.find((button) => {
        if (button === dragging) return false
        const rect = button.getBoundingClientRect()
        return x < rect.left + rect.width / 2
      })
      if (target === undefined) dock.appendChild(dragging)
      else dock.insertBefore(dragging, target)
      // FLIP: остальные кнопки плавно доезжают на новое место.
      for (const [button, oldRect] of before) {
        if (button === dragging) continue
        const newRect = button.getBoundingClientRect()
        const delta = oldRect.left - newRect.left
        if (Math.abs(delta) < 1) continue
        button.animate(
          [{ transform: `translateX(${String(delta)}px)` }, { transform: 'translateX(0)' }],
          { duration: 140, easing: 'cubic-bezier(.2,.8,.2,1)' },
        )
      }
    }

    // Магнит к краям: у края дока прокрутка продолжается сама, чтобы перетащить
    // инструмент через весь список.
    let edgeDirection = 0
    let edgeFrame = 0
    let lastPointerX = 0
    const edgeStep = () => {
      edgeFrame = 0
      if (dragging === null || edgeDirection === 0) return
      const before = dock.scrollLeft
      dock.scrollLeft += edgeDirection * 14
      if (dock.scrollLeft !== before) reorderAt(lastPointerX)
      edgeFrame = window.requestAnimationFrame(edgeStep)
    }
    const updateEdge = (x) => {
      const rect = dock.getBoundingClientRect()
      const next = x < rect.left + 36 ? -1 : x > rect.right - 36 ? 1 : 0
      if (next === edgeDirection) return
      edgeDirection = next
      if (next !== 0 && edgeFrame === 0) edgeFrame = window.requestAnimationFrame(edgeStep)
    }

    dock.addEventListener('pointermove', (event) => {
      if (dragging !== null) {
        if (event.cancelable) event.preventDefault()
        lastPointerX = event.clientX
        reorderAt(lastPointerX)
        updateEdge(lastPointerX)
        return
      }
      if (scrolling) {
        if (event.cancelable) event.preventDefault()
        const delta = lastX - event.clientX
        dock.scrollLeft += delta
        velocity = delta
        lastX = event.clientX
        suppressClickUntil = Date.now() + 350
        return
      }
      if (candidate === null) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.abs(dx) > 10 && Math.abs(dx) >= Math.abs(dy)) {
        window.clearTimeout(timer)
        candidate = null
        scrolling = true
        lastX = event.clientX
        velocity = 0
        suppressClickUntil = Date.now() + 350
        if (event.cancelable) event.preventDefault()
        return
      }
      if (Math.abs(dy) > 14 || Math.abs(dx) > 14) {
        window.clearTimeout(timer)
        candidate = null
      }
    }, { passive: false })

    dock.addEventListener('pointerup', finish)
    dock.addEventListener('pointercancel', finish)
    dock.addEventListener('click', (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault()
        event.stopPropagation()
      }
    }, true)
  }

  /**
   * Кнопка-действие нижней панели: нажатие просто вызывает скрытую кнопку клиента.
   *
   * Так в док попадают навигация и панели без дублирования логики клиента.
   *
   * @param {string} key стабильный ключ.
   * @param {string} label подпись/aria.
   * @param {string} svg иконка.
   * @param {() => Element|undefined|null} findSource поиск исходной кнопки.
   * @param {Element} dock контейнер дока.
   * @returns {Element|undefined} созданная кнопка.
   */
  function createActionButton(key, label, svg, findSource, dock) {
    const existing = dock.querySelector(`[data-dshm-action="${key}"]`)
    const source = findSource()
    if (existing !== null) {
      if (source !== null && source !== undefined) {
        delete existing.dataset.dshmMissing
        return existing
      }
      const misses = Number(existing.dataset.dshmMissing ?? 0) + 1
      existing.dataset.dshmMissing = String(misses)
      if (misses < 5) return existing
      existing.remove()
    }
    if (source === null || source === undefined) return undefined
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.dshmAction = key
    button.className = 'dshm-tool'
    button.setAttribute('aria-label', label)
    button.title = label
    button.innerHTML = svg
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      tapHaptic()
      const dockElement = button.parentElement
      if (dockElement !== null) delete dockElement.dataset.dshmUnread
      const source = findSource()
      if (source === null || source === undefined) return
      source.click()
      // Подсветка «инструмент открыт»: панель/ящик появляются после клика,
      // поэтому состояние снимаем чуть позже.
      const sync = () => {
        if (key === 'menu') {
          button.setAttribute('aria-expanded', document.documentElement.hasAttribute('data-dshm-drawer') ? 'true' : 'false')
        } else if (key === 'files') {
          button.setAttribute('aria-expanded', rightPanelVisible ? 'true' : 'false')
        }
      }
      for (const delay of [80, 300, 800]) window.setTimeout(sync, delay)
    })
    dock.appendChild(button)
    return button
  }

  /**
   * Кнопка «все инструменты», пока док свёрнут: стоит в строке композера.
   *
   * В развёрнутом состоянии она не нужна — там есть собственная сетка в доке.
   * Вставляется перед основной кнопкой отправки, чтобы попасть в промежуток
   * между выбором модели/разрешений, плюсом и голосовым вводом.
   *
   * @param {Element} dock док композера.
   */
  function ensureDockLauncher(dock) {
    const trailing = [...document.querySelectorAll(':is([class$="_trailing"], [class*="_trailing "])')]
      .find((element) => element.closest('[class*="_composerStack"]') !== null
        && element.getBoundingClientRect().width > 0
        && element.querySelector('button') !== null)
    let launcher = document.querySelector('.dshm-grid-launcher')
    if (trailing === undefined) {
      launcher?.remove()
      return
    }
    if (launcher === null) {
      launcher = document.createElement('button')
      launcher.type = 'button'
      launcher.className = 'dshm-grid-launcher'
      launcher.setAttribute('aria-label', tr('Все инструменты'))
      launcher.title = tr('Все инструменты')
      launcher.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>'
      launcher.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        tapHaptic()
        writeCollapsed(false)
        setAttrIfChanged(document.documentElement, 'data-dshm-dock-collapsed', '0')
        if (dock !== null) dock.scrollLeft = 0
        if (dock !== null) {
          dock.dataset.dshmEnter = '1'
          window.setTimeout(() => { delete dock.dataset.dshmEnter }, 260)
        }
      })
    }
    // Ближе к центру строки: перед группой микрофона, а не перед отправкой.
    const activity = [...trailing.children]
      .find((element) => /activity/iu.test(String(element.className)))
    const primary = [...trailing.querySelectorAll('button')]
      .find((button) => /primary/iu.test(String(button.className)))
    const anchor = activity ?? primary ?? null
    if (launcher.parentElement !== trailing) trailing.insertBefore(launcher, anchor)
    else if (launcher.nextElementSibling !== anchor) trailing.insertBefore(launcher, anchor)
  }

  /**
   * Обновить градиенты-подсказки прокрутки дока по его позиции.
   *
   * @param {Element} dock контейнер дока.
   */
  function syncDockScroll(dock) {
    const max = dock.scrollWidth - dock.clientWidth
    const left = dock.scrollLeft
    const next = max <= 1 ? 'none' : left <= 8 ? 'start' : left >= max - 8 ? 'end' : 'middle'
    setAttrIfChanged(dock, 'data-dshm-scroll', next)
  }

  /**
   * Нижняя панель инструментов и кнопка сворачивания ящика.
   *
   * Владелец продукта: длинные подписи статистики не нужны — нужны кнопки. Клиент
   * уже даёт кнопки статистики с полным текстом в aria-label и открывает по нажатию
   * родные диалоги, поэтому подписи прячем, а кнопки делаем квадратными 44 px.
   * Скрытые кнопки шапки (команда агентов, субагенты, фоновые задачи) переносим в
   * панель: до них нельзя дотянуться, а их панели превращаем в нижние шторки.
   */
  function markStats() {
    const dock = composerDock()
    if (dock !== null) {
      cleanupForeignDocks(dock)
      ensureDockLauncher(dock)
      for (const element of dock.querySelectorAll('[data-dshm-meta]')) element.removeAttribute('data-dshm-meta')
      const icons = {
        agents: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M9 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm7 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-7 2c-3.3 0-6 1.8-6 4v2h12v-2c0-2.2-2.7-4-6-4Zm7 0c-.4 0-.9 0-1.3.1A5.7 5.7 0 0 1 17 17v2h5v-2c0-1.9-2.2-3.5-5-3.5Z"/></svg>',
        subagents: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2V12M12 12H5v4.8M12 12h7v4.8"/></svg>',
        jobs: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
      }
      createToolButton('agents', /Команда агентов|Agent team/i, tr('Команда агентов'), icons.agents, dock)
      createToolButton('subagents', /^\d+\s+(субагент|subagent)/iu, tr('Субагенты'), icons.subagents, dock)
      createToolButton('jobs', /^\d*\s*(фоновая задача|background task)/iu, tr('Фоновые задачи'), icons.jobs, dock)

      // Навигация и панели — рядом со статистикой, всё под большим пальцем.
      const navIcons = {
        menu: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h10M4 17h16"/></svg>',
        newSession: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
        search: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
        plugins: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
        tasks: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
        files: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M9 4v16"/></svg>',
      }
      const findButton = (pattern) => [...document.querySelectorAll('button')]
        .find((button) => pattern.test((button.getAttribute('aria-label') || '').trim()))
      createActionButton('menu', tr('Боковое меню'), navIcons.menu, () => document.querySelector('.dshm-menu'), dock)
      createActionButton('newSession', tr('Новая сессия'), navIcons.newSession,
        () => findButton(/^(Новая сессия( в|$)|New session( in|$)|新建会话)/iu), dock)
      createActionButton('search', tr('Поиск сессий'), navIcons.search,
        () => findButton(/^(Поиск сессий|Search sessions|搜索会话)$/iu), dock)
      createActionButton('plugins', tr('Плагины'), navIcons.plugins,
        () => findButton(/^(Плагины|Plugins|插件)$/iu), dock)
      createActionButton('tasks', tr('Автоматические задачи'), navIcons.tasks,
        () => findButton(/^(Автоматические задачи|Automations|自动任务)$/iu), dock)
      createActionButton('files', tr('Правая панель'), navIcons.files,
        () => {
          // Стабильные data-хуки вместо переводимых aria-label.
          const expand = document.querySelector('[data-sidebar-right-expand]')
          const close = [...document.querySelectorAll('[data-sidebar-right-toggle]')]
            .find((button) => button.getBoundingClientRect().width > 0)
          return rightPanelVisible ? (close ?? expand) : (expand ?? close)
        }, dock)

      // Бейджи-счётчики и подсветка открытых панелей: док показывает состояние,
      // а не только запускает действия.
      const setBadge = (button, count) => {
        if (button === null || button === undefined) return
        let badge = button.querySelector('.dshm-badge')
        if (count > 0) {
          if (badge === null) {
            badge = document.createElement('span')
            badge.className = 'dshm-badge'
            button.appendChild(badge)
          }
          badge.textContent = String(count)
        } else if (badge !== null) badge.remove()
      }
      const refreshCount = (key, pattern) => {
        const button = dock.querySelector(`[data-dshm-tool="${key}"]`)
        if (button === null) return
        const source = [...document.querySelectorAll('button')]
          .find((candidate) => !candidate.classList.contains('dshm-tool')
            && pattern.test(candidate.getAttribute('aria-label') ?? ''))
        if (source === undefined) return
        // Подпись кнопки остаётся локализованной; обновляем только счётчик.
        const aria = source.getAttribute('aria-label') || ''
        const match = /(\d+)/u.exec(aria)
        setBadge(button, match === null ? 0 : Number(match[1]))
      }
      refreshCount('subagents', /^\d+\s+(субагент|subagent)/iu)
      refreshCount('jobs', /^\d*\s*(фоновая задача|background task)/iu)
      // Кнопка-сетка: альтернатива свайпу вверх, всегда в начале дока.
      if (dock.querySelector('[data-dshm-grid]') === null) {
        const gridButton = document.createElement('button')
        gridButton.type = 'button'
        gridButton.dataset.dshmGrid = ''
        gridButton.className = 'dshm-tool'
        gridButton.setAttribute('aria-label', tr('Все инструменты'))
        gridButton.title = tr('Все инструменты')
        gridButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>'
        gridButton.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          tapHaptic()
          if (dock !== null) delete dock.dataset.dshmUnread
          openToolGrid()
        })
        dock.insertBefore(gridButton, dock.firstChild)
      } else if (dock.firstElementChild?.dataset.dshmGrid === undefined) {
        dock.insertBefore(dock.querySelector('[data-dshm-grid]'), dock.firstChild)
      }

      // Шеврон сворачивания/разворачивания дока — последним, чтобы был справа.
      let dockToggle = dock.querySelector('.dshm-dock-toggle')
      if (dockToggle === null) {
        dockToggle = document.createElement('button')
        dockToggle.type = 'button'
        dockToggle.className = 'dshm-tool dshm-dock-toggle'
        dockToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
        dockToggle.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          tapHaptic()
          const next = document.documentElement.getAttribute('data-dshm-dock-collapsed') !== '1'
          writeCollapsed(next)
          setAttrIfChanged(document.documentElement, 'data-dshm-dock-collapsed', next ? '1' : '0')
          dockToggle.setAttribute('aria-label', next ? tr('Развернуть панель инструментов') : tr('Свернуть панель инструментов'))
          dockToggle.title = dockToggle.getAttribute('aria-label')
        })
        dock.appendChild(dockToggle)
      }
      if (dockToggle !== null && dock.lastElementChild !== dockToggle) dock.appendChild(dockToggle)
      setAttrIfChanged(document.documentElement, 'data-dshm-dock-collapsed', readCollapsed() ? '1' : '0')
      const toggleLabel = readCollapsed() ? tr('Развернуть панель инструментов') : tr('Свернуть панель инструментов')
      if (dockToggle !== null && dockToggle.getAttribute('aria-label') !== toggleLabel) {
        dockToggle.setAttribute('aria-label', toggleLabel)
        dockToggle.title = toggleLabel
      }
      if (dock.dataset.dshmSeen !== '1') {
        dock.dataset.dshmSeen = '1'
        dock.dataset.dshmEnter = '1'
        window.setTimeout(() => { delete dock.dataset.dshmEnter }, 260)
      }

      // Первый запуск: брифинг и подсказка, что док листается и раскрывается.
      showOnboarding(false)
      try {
        if (localStorage.getItem('dshm.dockHintShown') !== '1') {
          localStorage.setItem('dshm.dockHintShown', '1')
          const hint = document.createElement('div')
          hint.className = 'dshm-dock-hint'
          hint.textContent = tr('Листайте панель · удерживайте иконку, чтобы переставить')
          document.body.appendChild(hint)
          window.requestAnimationFrame(() => { hint.dataset.dshmShow = '1' })
          window.setTimeout(() => {
            hint.dataset.dshmShow = '0'
            window.setTimeout(() => hint.remove(), 300)
          }, 5_500)
        }
      } catch {}

      // Бегущие фоновые задачи: пульсирующий бейдж.
      const jobsTool = dock.querySelector('[data-dshm-tool="jobs"]')
      if (jobsTool !== null) {
        setAttrIfChanged(jobsTool, 'data-dshm-running', /выполняется|running/i.test(jobsTool.getAttribute('aria-label') ?? '') ? '1' : '0')
      }

      // Живое состояние: идёт ход, заполнение контекста, вспышка завершения.
      const busy = [...document.querySelectorAll('button')]
        .some((button) => /^(Остановить|Stop|停止)\b/u.test((button.getAttribute('aria-label') ?? '').trim()))
      const wasBusy = dock.dataset.dshmBusy === '1'
      setAttrIfChanged(dock, 'data-dshm-busy', busy ? '1' : '0')
      if (wasBusy && !busy) {
        dock.dataset.dshmDone = '1'
        window.setTimeout(() => { delete dock.dataset.dshmDone }, 1_200)
        const away = document.documentElement.hasAttribute('data-dshm-drawer')
          || rightPanelVisible || onSecondaryScreen() || document.hidden
        if (away) dock.dataset.dshmUnread = '1'
      }
      const contextSource = [...dock.querySelectorAll('button')]
        .find((button) => /контекст|context/iu.test(button.getAttribute('aria-label') ?? ''))
      if (contextSource !== undefined) {
        setAttrIfChanged(contextSource, 'data-dshm-context-tool', '1')
        const match = /(\d+)\s*%/u.exec(contextSource.getAttribute('aria-label') ?? '')
        const percent = match === null ? 0 : Number(match[1])
        setAttrIfChanged(dock, 'data-dshm-context', percent >= 95 ? 'crit' : percent >= 80 ? 'warn' : 'ok')
      }

      // Скрытые в сетке инструменты не рисуются в доке (но остаются в меню).
      const hiddenKeys = readHidden()
      for (const element of dock.querySelectorAll('[data-dshm-tool], [data-dshm-action]')) {
        const key = sourceKey(element)
        setAttrIfChanged(element, 'data-dshm-dock-hidden', hiddenKeys.includes(key) ? '1' : null)
      }
      for (const button of dock.querySelectorAll('button')) {
        if (button.dataset.dshmTool !== undefined || button.dataset.dshmAction !== undefined) continue
        const key = dockKey(button)
        if (key === '') continue
        const wrapper = button.closest('[data-composer-stat]') ?? button.parentElement
        if (wrapper === null) continue
        setAttrIfChanged(wrapper, 'data-dshm-dock-hidden', hiddenKeys.includes(key) ? '1' : null)
      }

      // Стабильный порядок: скрытые не мешают, дальше сохранённый порядок и новые.
      const defaultOrder = ['agents', 'subagents', 'jobs', 'menu', 'newSession', 'search', 'plugins', 'tasks', 'files']
      const keyOf = (element) => element.dataset.dshmTool || element.dataset.dshmAction || ''
      const currentOrder = [...dock.children].map(keyOf).filter((key) => key !== '')
      rightPanelVisible = document.querySelector('[data-sidebar-right-open]') !== null
      const rightOpen = rightPanelVisible
      const contextual = rightOpen && currentOrder.includes('files') ? ['files'] : []
      const savedOrder = readOrder().filter((key) => currentOrder.includes(key) && !contextual.includes(key))
      const desired = [
        ...contextual,
        ...savedOrder,
        ...defaultOrder.filter((key) => currentOrder.includes(key)
          && !contextual.includes(key) && !savedOrder.includes(key)),
      ]
      if (currentOrder.join(',') !== desired.join(',')) {
        for (const key of desired) {
          const element = dock.querySelector(`[data-dshm-tool="${key}"], [data-dshm-action="${key}"]`)
          if (element !== null) dock.appendChild(element)
        }
      }
      bindDockDrag(dock)
      if (dock.dataset.dshmBound !== '') {
        dock.dataset.dshmBound = ''
        dock.addEventListener('scroll', () => syncDockScroll(dock), { passive: true })
        const touched = () => { dock.dataset.dshmTouched = '1' }
        dock.addEventListener('pointerdown', touched, { passive: true })
        dock.addEventListener('touchstart', touched, { passive: true })
        // Свайп вверх по доку раскрывает сетку всех инструментов.
        let swipeStart = null
        dock.addEventListener('touchstart', (event) => {
          const touch = event.touches[0]
          if (touch === undefined) return
          swipeStart = { x: touch.clientX, y: touch.clientY }
        }, { passive: true })
        dock.addEventListener('touchmove', (event) => {
          if (swipeStart === null) return
          const touch = event.touches[0]
          if (touch === undefined) return
          const dy = swipeStart.y - touch.clientY
          const dx = Math.abs(touch.clientX - swipeStart.x)
          if (dy > 36 && dy > dx * 1.6) {
            swipeStart = null
            if (event.cancelable) event.preventDefault()
            openToolGrid()
          }
        }, { passive: false })
        dock.addEventListener('touchend', () => { swipeStart = null }, { passive: true })
      }
      // Пока человек не трогал док, держим его в начале: новые кнопки при отрисовке
      // иначе уводили прокрутку к концу (scroll anchoring клиента).
      if (dock.dataset.dshmTouched !== '1') dock.scrollLeft = 0
      syncDockScroll(dock)

      // Иконки без подписей: долгое нажатие показывает название над кнопкой.
      if (dock.dataset.dshmTips !== '1') {
        dock.dataset.dshmTips = '1'
        let tip = null
        let timer = 0
        const hideTip = () => {
          window.clearTimeout(timer)
          if (tip !== null) tip.dataset.dshmShow = '0'
        }
        const showTip = (button) => {
          if (document.querySelector('.dshm-dragging') !== null) return
          const label = (button.getAttribute('aria-label') || button.title || '').trim()
          if (label === '') return
          if (tip === null) {
            tip = document.createElement('div')
            tip.className = 'dshm-tip'
            document.body.appendChild(tip)
          }
          tip.textContent = label
          const rect = button.getBoundingClientRect()
          tip.style.left = `${Math.min(Math.max(rect.left + rect.width / 2, 60), window.innerWidth - 60)}px`
          tip.style.top = `${Math.max(rect.top - 6, 8)}px`
          tip.dataset.dshmShow = '1'
        }
        dock.addEventListener('pointerdown', (event) => {
          const button = event.target instanceof Element ? event.target.closest('.dshm-tool') : null
          if (button === null) return
          window.clearTimeout(timer)
          timer = window.setTimeout(() => showTip(button), 420)
        }, { passive: true })
        for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'scroll']) {
          dock.addEventListener(type, hideTip, { passive: true })
        }
      }
      // Если шторку закрыли системной «назад»/Escape, снимаем aria-expanded.
      const sheet = document.querySelector('[data-dshm-sheet]')
      for (const button of dock.querySelectorAll('.dshm-tool')) {
        if (button.getAttribute('aria-expanded') === 'true' && sheet === null) button.setAttribute('aria-expanded', 'false')
      }
      // Затемнение шторки не должно оставаться, если клиент закрыл панель сам.
      if (document.querySelector('[data-dshm-sheet]') === null) {
        for (const scrim of document.querySelectorAll('.dshm-sheet-scrim')) {
          scrim.dataset.dshmShow = '0'
          window.setTimeout(() => scrim.remove(), 220)
        }
      }

      // Чужой элемент с нашей меткой (например, правая панель от старой версии
      // слоя) не должен оставаться нижней шторкой.
      for (const marked of document.querySelectorAll('[data-dshm-sheet]')) {
        // Метка от прошлого экземпляра слоя (старая версия/перезагрузка) снимается;
        // шторки текущего экземпляра живут по токену, а не по хэшу клиента.
        if (marked.dataset.dshmSheetToken !== SHEET_TOKEN) {
          marked.removeAttribute('data-dshm-sheet')
          delete marked.dataset.dshmSheetToken
          marked.querySelectorAll('.dshm-sheet-close, .dshm-sheet-handle').forEach((element) => element.remove())
        }
      }
    }

    // Сворачивание ящика внизу, обычной строкой в подвале меню.
    const column = document.querySelector(':is([class$="_sidebarCol"], [class*="_sidebarCol "])')
    if (column !== null && column.querySelector('[data-dshm-collapse]') === null) {
      const collapse = document.createElement('button')
      collapse.type = 'button'
      collapse.dataset.dshmCollapse = ''
      collapse.className = 'dshm-collapse-row'
      collapse.setAttribute('aria-label', tr('Свернуть боковую панель'))
      collapse.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h10M4 17h16"/></svg><span>' + tr('Свернуть панель') + '</span>'
      collapse.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        closeDrawer()
      })
      const foot = column.querySelector('[class*="_footArea"]') ?? column.querySelector('[class*="_settingsArea"]')
      ;(foot ?? column).appendChild(collapse)
    }
  }

  /* ── 7. УВЕДОМЛЕНИЯ ЧЕРЕЗ НАТИВНЫЙ МОСТ ───────────────────────────────
   * Штатный мобильный слой на нашей странице не включается — её отдаёт наш
   * шлюз, и для плагина она выглядит настольной. Поэтому наблюдатель за
   * вопросами и завершением хода живёт здесь и зовёт нативный мост
   * приложения, только когда страница скрыта.
   */

  /**
   * Уведомления в фоне, пока страница скрыта.
   *
   * Почему это делает слой, а не плагин компьютера: штатный мобильный слой
   * `dsh-mobile` на нашей странице не включается — её отдаёт наш шлюз, и для
   * плагина она выглядит настольной (`__DSH_MOBILE_FRONTEND__` не равен
   * `dedicated`, host — частный IP). Поэтому его наблюдатель в фоне здесь не
   * работает: проверено — карточка `[data-question-key]` в фоне видна, а
   * вызовов моста ноль; завершение хода тоже молчит. Слой сам смотрит состояние
   * композера и карточки вопросов и зовёт нативный мост приложения.
   */
  const QUESTION_SELECTOR = '[data-question-key],[data-plan-review-key]'

  const seenQuestionKeys = new Set()

  const COMPLETION_GRACE_MS = 8000

  const COMPLETION_MIN_BUSY_MS = 20000

  let bridgeCapabilities = null

  let completionBusy = null

  let completionBusySince = 0

  let completionTimer = 0

  /**
   * Возможности нативного моста приложения.
   *
   * @param {boolean} fresh запросить заново, а не взять кэш.
   * @returns {Promise<unknown>} список возможностей; пустой, если моста нет.
   */
  function bridgeCapabilityList(fresh) {
    const bridge = window.__DSH_MOBILE_NATIVE__
    if (bridge === undefined || typeof bridge.invoke !== 'function') return Promise.resolve([])
    if (!fresh && bridgeCapabilities !== null) return bridgeCapabilities
    const list = Promise.resolve()
      .then(() => (typeof bridge.capabilities === 'function' ? bridge.capabilities() : []))
      .catch(() => [])
    if (!fresh) bridgeCapabilities = list
    return list
  }

  /**
   * Вызвать метод нативного моста, если приложение объявило его возможность.
   *
   * @param {string} capability имя возможности (`notification.notify`, `keyboard.show`).
   * @param {string} method имя метода моста.
   * @param {object} payload аргументы вызова.
   * @param {boolean} [fresh] запросить возможности заново вместо кэша.
   */
  function invokeBridge(capability, method, payload, fresh = false) {
    const bridge = window.__DSH_MOBILE_NATIVE__
    if (bridge === undefined || typeof bridge.invoke !== 'function') return
    void bridgeCapabilityList(fresh).then((capabilities) => {
      if (!Array.isArray(capabilities) || !capabilities.includes(capability)) return
      return bridge.invoke(method, payload)
    }).catch(() => {})
  }

  /**
   * Показать уведомление через нативный мост приложения, если он умеет.
   *
   * @param {string} title заголовок.
   * @param {string} body текст.
   * @param {string} tag метка, по которой Android схлопывает повторы.
   */
  /** Тексты уведомлений на языке интерфейса: страница знает локаль, мост — нет. */
  const NOTIFY_TEXT = {
    ru: { doneTitle: 'Задача завершена', doneBody: 'Задача в DSH завершена', questionTitle: 'Нужен ваш ответ', questionBody: 'DSH ждёт вашего выбора' },
    en: { doneTitle: 'Task finished', doneBody: 'Your DSH task finished', questionTitle: 'Input needed', questionBody: 'DSH waits for your choice' },
    zh: { doneTitle: '任务已完成', doneBody: 'DSH 任务已完成', questionTitle: '需要您的回答', questionBody: 'DSH 正在等待您的选择' },
  }

  /** Выбрать язык уведомлений по языку документа/системы. */
  function notifyStrings() {
    return NOTIFY_TEXT[uiLang()] ?? NOTIFY_TEXT.ru
  }

  /**
   * Показать подсказку, если система не разрешает уведомления.
   *
   * Без этого отказ в POST_NOTIFICATIONS выглядел как исчезающие уведомления без
   * причины. Подсказка ведёт в системные настройки уведомлений приложения.
   */
  function showNotifyPermissionHint() {
    if (document.querySelector('.dshm-notify-hint') !== null) return
    const hint = document.createElement('button')
    hint.type = 'button'
    hint.className = 'dshm-notify-hint'
    hint.textContent = tr('Уведомления отключены — включите их в настройках приложения')
    hint.addEventListener('click', () => {
      invokeBridge('notification.settings', 'notification.settings', {})
      hint.remove()
    })
    document.body.appendChild(hint)
    window.setTimeout(() => hint.remove(), 10_000)
  }

  /**
   * Показать уведомление через нативный мост и отреагировать на отказ в разрешении.
   *
   * @param {string} title заголовок.
   * @param {string} body текст.
   * @param {string} tag метка, по которой Android схлопывает повторы.
   */
  function notifyThroughBridge(title, body, tag) {
    const bridge = window.__DSH_MOBILE_NATIVE__
    if (bridge === undefined || typeof bridge.invoke !== 'function') return
    void bridgeCapabilityList().then((capabilities) => {
      if (!Array.isArray(capabilities) || !capabilities.includes('notification.notify')) return
      return Promise.resolve(bridge.invoke('notification.notify', { title, body, tag: tag.slice(0, 64) }))
    }).then((result) => {
      let parsed = result
      if (typeof result === 'string') { try { parsed = JSON.parse(result) } catch {} }
      if (parsed?.error?.code === 'permission_denied') showNotifyPermissionHint()
    }).catch((error) => {
      // Нативный мост бросает Error с текстом «уведомления отключены…», а не
      // возвращает код ошибки. Без этой ветки отказ снова был бы молчаливым.
      const message = String(error?.message ?? error)
      if (/уведомлен|notification|permission|отключен|denied|disabled/iu.test(message)) showNotifyPermissionHint()
    })
  }

  /**
   * Не дать автооткрытию плана накрыть карточку подтверждения.
   *
   * Клиент при появлении plan review сам открывает вкладку «План · Markdown»; на
   * телефоне правая панель презентуется во весь экран и закрывает кнопки
   * «Запросить изменения»/«Подтвердить» (проверено: elementFromPoint в центре
   * карточки отдавал список панели). Панель по-прежнему можно открыть ссылкой
   * «Открыть план целиком»; автоматически закрываем её только один раз на карточку,
   * чтобы не спорить с человеком.
   */
  const autoClosedPlanPanels = new Set()

  function keepPlanCardVisible() {
    const card = document.querySelector('[data-plan-review-key]')
    if (card === null) return
    const key = card.getAttribute('data-plan-review-key')
    if (key === null || key === '' || autoClosedPlanPanels.has(key)) return
    autoClosedPlanPanels.add(key)
    if (autoClosedPlanPanels.size > 10) {
      const oldest = autoClosedPlanPanels.values().next()
      if (!oldest.done) autoClosedPlanPanels.delete(oldest.value)
    }
    closeRightPanel()
  }

  /**
   * Уведомить о вопросе, который появился, пока страница скрыта.
   *
   * Вопрос, который человек видел на экране, не уведомляем: он его уже видел.
   */
  function notifyQuestion() {
    // Если штатный мобильный слой всё-таки включён (страница отдана им, а не
    // нашим шлюзом), у него есть свой наблюдатель — не дублируем уведомления.
    if (document.documentElement.classList.contains('dsh-native-mobile-active')) return
    const card = document.querySelector(QUESTION_SELECTOR)
    if (card === null) return
    const key = card.getAttribute('data-question-key') ?? card.getAttribute('data-plan-review-key')
    if (key === null || key === '') return
    if (!document.hidden) {
      seenQuestionKeys.add(key)
      return
    }
    if (seenQuestionKeys.has(key)) return
    seenQuestionKeys.add(key)
    if (seenQuestionKeys.size > 20) {
      const oldest = seenQuestionKeys.values().next()
      if (!oldest.done) seenQuestionKeys.delete(oldest.value)
    }
    const questionText = notifyStrings()
    notifyThroughBridge(questionText.questionTitle, questionText.questionBody, `dsh-task-question-${key}`)
  }

  /**
   * Идёт ли ход агента — по состоянию композера или кнопке остановки.
   *
   * Кнопки ищем внутри композера, а не по всей странице: на длинной переписке
   * `querySelectorAll('button')` с проверкой каждой подписи каждые 800 мс давал
   * заметную работу (и редкие кадры по 60–120 мс вместе с остальным тиком).
   * Полный обход остаётся запасным путём, когда композера на экране нет.
   */
  function composerBusy() {
    const card = document.querySelector('[data-composer-card]')
    if (card !== null) {
      // Клиент не ставит aria-busy на композер: единственный честный признак —
      // кнопка остановки внутри карточки композера (ru/en/zh).
      return [...card.querySelectorAll('button')]
        .some((button) => /Останов|Stop|停止/iu.test(button.getAttribute('aria-label') || ''))
    }
    return [...document.querySelectorAll('button')]
      .some((button) => /Останов|Stop|停止/iu.test(button.getAttribute('aria-label') || ''))
  }

  /** Уведомить о завершении хода, если оно случилось, пока страница скрыта. */
  function notifyCompletedTurn() {
    completionTimer = 0
    if (document.documentElement.classList.contains('dsh-native-mobile-active')) return
    if (!document.hidden) return
    if (document.querySelector(QUESTION_SELECTOR) !== null) return
    const doneText = notifyStrings()
    notifyThroughBridge(doneText.doneTitle, doneText.doneBody, 'dsh-task-done')
  }

  /**
   * Отследить переход «работает → свободен» и уведомить о завершении.
   *
   * Короткий ход ждёт паузу в несколько секунд: композер мигает между шагами, и
   * уведомление на каждом шаге было бы шумом. Ход, который держал композер
   * дольше двадцати секунд, уведомляет сразу — это уже не мигание.
   */
  function watchCompletion() {
    const busy = composerBusy()
    if (completionBusy === null) {
      completionBusy = busy
      if (busy) completionBusySince = Date.now()
      return
    }
    if (busy === completionBusy) return
    completionBusy = busy
    if (busy) {
      completionBusySince = Date.now()
      if (completionTimer !== 0) {
        clearTimeout(completionTimer)
        completionTimer = 0
      }
      return
    }
    if (!document.hidden) return
    if (Date.now() - completionBusySince >= COMPLETION_MIN_BUSY_MS) {
      notifyCompletedTurn()
      return
    }
    if (completionTimer === 0) completionTimer = setTimeout(notifyCompletedTurn, COMPLETION_GRACE_MS)
  }

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

  /** Перевод и адаптация подписей, которые зависят от телефона. */
  function translate() {
    const now = Date.now()
    if (now - translatedAt < 1000) return
    translatedAt = now
    translateQueueHint()
  }

  /** Закрывать панель после перехода и не поднимать клавиатуру. */

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
  const DESKTOP_ONLY = /^(Mobile access|Открыть в Finder|Open in Finder|Другие способы открыть|Other ways to open|Показать расположение файла|Reveal in Finder)$/iu

  function hideLegacyMobileAccess() {
    for (const row of document.querySelectorAll(':is([class$="_panelRow"], [class*="_panelRow "]), button')) {
      const label = (row.getAttribute('aria-label') || '').trim()
      const text = (row.innerText || '').trim()
      if (!DESKTOP_ONLY.test(label) && !DESKTOP_ONLY.test(text)) continue
      if (row.getAttribute('data-dshm-hidden') === '') continue
      row.setAttribute('data-dshm-hidden', '')
      row.style.display = 'none'
    }
  }

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
      guardAutofocus()
      translate()
      new MutationObserver(translate).observe(document.body, { childList: true, subtree: true })
      closeOnNavigate()
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
