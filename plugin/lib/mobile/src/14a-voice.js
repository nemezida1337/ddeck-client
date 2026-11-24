  /* ── 14a. ГОЛОСОВОЙ ВВОД: ПРЕДВАРИТЕЛЬНОЕ РАЗРЕШЕНИЕ ─────────────────────
   * DSH 0.2.2-rc.5 добавил экспериментальный плагин голосового ввода: микрофон
   * в композере вызывает getUserMedia, и WebView отдаёт его только при уже
   * выданном RECORD_AUDIO. Если разрешения нет, DSH рисует «Разрешите доступ к
   * микрофону» и молча висит: системный диалог запрашивается из
   * onPermissionRequest, то есть уже после того, как тулбар начал ждать.
   *
   * Здесь мы перехватываем первое нажатие на микрофон, спрашиваем Android
   * заранее (bridge `microphone.ensure`) и показываем свой короткий лист:
   * «Разрешить» либо «Открыть настройки», если система больше не спрашивает.
   * После выдачи разрешения повторяем исходный клик, и запись идёт штатным
   * путём DSH — свой рекордер не изобретаем.
   */

  /** Нажатие, которое мы пропускаем к DSH после выдачи разрешения. */
  let voiceBypassUntil = 0

  /** Разрешение уже подтверждено в этой сессии страницы. */
  let voicePermissionGranted = false

  /** Лист с объяснением, пока он открыт. */
  let voicePermissionSheet = null

  /** Микрофон DSH в композере (метка переводится). */
  const VOICE_MIC_LABEL = /^(Начать запись|Start recording|开始录音|録音を開始)$/u

  /**
   * Кнопка микрофона голосового ввода DSH.
   *
   * @param {Element|null} element кандидат.
   * @returns {boolean} это микрофон DSH, а не наша кнопка.
   */
  function isVoiceMic(element) {
    return element !== null
      && element.tagName === 'BUTTON'
      && element.closest('.dshm-bottom-nav, .dshm-tool, .dshm-more-menu, .dshm-grid') === null
      && VOICE_MIC_LABEL.test((element.getAttribute('aria-label') || '').trim())
  }

  /**
   * Спросить Android о RECORD_AUDIO до getUserMedia.
   *
   * @returns {Promise<'granted'|'requesting'|'denied'|'blocked'|'unsupported'>} состояние.
   */
  function ensureMicrophonePermission() {
    const bridge = window.__DSH_MOBILE_NATIVE__
    if (bridge === undefined || typeof bridge.capabilities !== 'function') return Promise.resolve('unsupported')
    return bridge.capabilities()
      .then((capabilities) => {
        if (!Array.isArray(capabilities) || !capabilities.includes('microphone.ensure')) return 'unsupported'
        return bridge.invoke('microphone.ensure', {})
      })
      .then((result) => {
        const state = result !== null && typeof result === 'object' ? result.state : undefined
        return typeof state === 'string' ? state : 'unsupported'
      })
      .catch(() => 'unsupported')
  }

  /** Закрыть лист разрешения. */
  function closeVoicePermissionSheet() {
    if (voicePermissionSheet === null) return
    voicePermissionSheet.remove()
    voicePermissionSheet = null
  }

  /**
   * Показать лист «нужен микрофон».
   *
   * @param {'requesting'|'blocked'} state что происходит сейчас.
   */
  function showVoicePermissionSheet(state) {
    closeVoicePermissionSheet()
    const scrim = document.createElement('div')
    scrim.className = 'dshm-voice-scrim'
    const card = document.createElement('div')
    card.className = 'dshm-voice-card'
    card.setAttribute('role', 'dialog')
    card.setAttribute('aria-modal', 'true')
    const title = document.createElement('strong')
    title.textContent = tr('Нужен доступ к микрофону')
    const text = document.createElement('p')
    text.textContent = state === 'blocked'
      ? tr('Разрешение отключено в настройках Android. Включите «Микрофон» для DDeck и вернитесь.')
      : tr('Подтвердите доступ в системном окне — после этого запись начнётся.')
    const actions = document.createElement('div')
    actions.className = 'dshm-voice-actions'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'dshm-voice-cancel'
    cancel.textContent = tr('Отмена')
    cancel.addEventListener('click', () => closeVoicePermissionSheet())
    actions.appendChild(cancel)
    if (state === 'blocked') {
      const open = document.createElement('button')
      open.type = 'button'
      open.className = 'dshm-voice-open'
      open.textContent = tr('Открыть настройки')
      open.addEventListener('click', () => {
        const bridge = window.__DSH_MOBILE_NATIVE__
        if (bridge !== undefined && typeof bridge.invoke === 'function') void bridge.invoke('microphone.settings', {})
        closeVoicePermissionSheet()
      })
      actions.appendChild(open)
    } else {
      const retry = document.createElement('button')
      retry.type = 'button'
      retry.className = 'dshm-voice-open'
      retry.textContent = tr('Разрешить')
      retry.addEventListener('click', () => {
        closeVoicePermissionSheet()
        void ensureMicrophonePermission().then((next) => {
          if (next === 'granted') {
            voicePermissionGranted = true
            clickVoiceMic()
          } else if (next === 'requesting') {
            showVoicePermissionSheet('requesting')
          } else {
            showVoicePermissionSheet('blocked')
          }
        })
      })
      actions.appendChild(retry)
    }
    card.append(title, text, actions)
    scrim.appendChild(card)
    scrim.addEventListener('click', (event) => { if (event.target === scrim) closeVoicePermissionSheet() })
    document.body.appendChild(scrim)
    voicePermissionSheet = scrim
  }

  /** Нажать микрофон DSH ещё раз, уже минуя наш перехват. */
  function clickVoiceMic() {
    const mic = [...document.querySelectorAll('button')].find((button) => isVoiceMic(button))
    if (mic === undefined) return
    voiceBypassUntil = Date.now() + 1500
    mic.click()
  }

  /** Перехват первого нажатия на микрофон и ответ Android на запрос. */
  function bindVoicePermission() {
    window.__dshmMicrophoneResult = (state) => {
      if (state === 'granted') {
        voicePermissionGranted = true
        closeVoicePermissionSheet()
        clickVoiceMic()
      } else if (state === 'blocked') {
        showVoicePermissionSheet('blocked')
      } else {
        showVoicePermissionSheet('blocked')
      }
    }
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null
      if (!isVoiceMic(target)) return
      if (voicePermissionGranted || Date.now() < voiceBypassUntil) return
      // Разрешение неизвестно: сначала спрашиваем Android, потом пускаем клик.
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      void ensureMicrophonePermission().then((state) => {
        if (state === 'granted' || state === 'unsupported') {
          // unsupported: не мешаем штатному пути DSH — пусть просит сам.
          if (state === 'granted') voicePermissionGranted = true
          clickVoiceMic()
          return
        }
        showVoicePermissionSheet(state === 'requesting' ? 'requesting' : 'blocked')
      })
    }, true)
  }
