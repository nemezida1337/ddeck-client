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

  /** Один guard на всё время жизни страницы; перезапускается при открытии. */
  let drawerGuardTimer = 0
  /** Подавить повторный перехват кнопки сворачивания, пока native drawer закрывается. */
  let suppressPanelCollapseUntil = 0
  function ensureDrawerGuard() {
    if (drawerGuardTimer !== 0) return
    drawerGuardTimer = window.setInterval(() => {
      if (!drawerOpen) {
        window.clearInterval(drawerGuardTimer)
        drawerGuardTimer = 0
        return
      }
      if (Date.now() - drawerOpenedAt <= 250) return
      if (hasSidebarContent()) return
      if (document.activeElement?.closest(':is([class$="_sidebarCol"], [class*="_sidebarCol "])') !== null) return
      closeDrawerLight()
    }, 250)
  }

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
  let pageScrim = null
  let accountScrim = null

  /** Кнопка аккаунта в нашей нижней строке: подсвечиваем её, пока меню открыто. */
  let accountButton = null

  /**
   * Показать/снять подсветку кнопки аккаунта.
   *
   * @param {boolean} active открыто ли меню аккаунта.
   */
  function setAccountButtonActive(active) {
    if (accountButton === null) return
    if (active) accountButton.setAttribute('data-dshm-active', '')
    else accountButton.removeAttribute('data-dshm-active')
  }


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

