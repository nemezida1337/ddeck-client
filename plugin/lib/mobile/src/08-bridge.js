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
   * Человеческое имя текущей сессии для текста уведомления.
   *
   * document.title меняется вместе с чатом; служебный суффикс клиента убираем.
   * Если заголовок пустой/общий, не добавляем шум в уведомление.
   */
  function notificationSessionTitle() {
    const title = String(document.title ?? '')
      .replace(/\s+—\s+DeepSeek Harness$/u, '')
      .trim()
    if (title === '' || title === 'DeepSeek Harness' || title.length > 80) return ''
    return title
  }

  /** Добавить имя сессии к тексту события, не дублируя его. */
  function notifyBodyWithContext(body) {
    const title = notificationSessionTitle()
    return title === '' ? body : body + ' · ' + title
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
  function notifyThroughBridge(title, body, tag, kind = 'done') {
    const bridge = window.__DSH_MOBILE_NATIVE__
    if (bridge === undefined || typeof bridge.invoke !== 'function') return
    void bridgeCapabilityList().then((capabilities) => {
      if (!Array.isArray(capabilities) || !capabilities.includes('notification.notify')) return
      return Promise.resolve(bridge.invoke('notification.notify', { title, body, tag: tag.slice(0, 64), kind }))
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
    notifyThroughBridge(questionText.questionTitle, notifyBodyWithContext(questionText.questionBody), `dsh-task-question-${key}`, 'question')
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
    notifyThroughBridge(doneText.doneTitle, notifyBodyWithContext(doneText.doneBody), 'dsh-task-done', 'done')
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

