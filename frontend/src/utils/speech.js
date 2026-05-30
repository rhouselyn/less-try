const SPEECH_LANG_MAP = {
  'en': 'en-US',
  'zh': 'zh-CN',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'es': 'es-ES',
  'it': 'it-IT',
  'pt': 'pt-BR',
  'ru': 'ru-RU',
  'ar': 'ar-SA',
  'hi': 'hi-IN',
  'th': 'th-TH',
  'vi': 'vi-VN',
  'nl': 'nl-NL',
  'pl': 'pl-PL',
  'sv': 'sv-SE',
  'da': 'da-DK',
  'no': 'nb-NO',
  'fi': 'fi-FI',
  'el': 'el-GR',
  'cs': 'cs-CZ',
  'ro': 'ro-RO',
  'hu': 'hu-HU',
  'tr': 'tr-TR',
  'uk': 'uk-UA',
  'id': 'id-ID',
  'ms': 'ms-MY',
  'he': 'he-IL',
  'bn': 'bn-IN',
  'ta': 'ta-IN',
  'sw': 'sw-KE',
  'ca': 'ca-ES',
  'hr': 'hr-HR',
  'bg': 'bg-BG',
  'sk': 'sk-SK',
  'sl': 'sl-SI',
  'et': 'et-EE',
  'lv': 'lv-LV',
  'lt': 'lt-LT',
}

let voicesLoaded = false
let voicesReadyPromise = null

function ensureVoicesLoaded() {
  if (voicesReadyPromise) return voicesReadyPromise
  if (!('speechSynthesis' in window)) {
    voicesReadyPromise = Promise.resolve()
    return voicesReadyPromise
  }
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    voicesLoaded = true
    voicesReadyPromise = Promise.resolve()
    return voicesReadyPromise
  }
  voicesReadyPromise = new Promise((resolve) => {
    const onVoicesChanged = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length > 0) {
        voicesLoaded = true
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
        resolve()
      }
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
    setTimeout(() => {
      const v = window.speechSynthesis.getVoices()
      if (v.length > 0) {
        voicesLoaded = true
      }
      resolve()
    }, 1000)
  })
  return voicesReadyPromise
}

ensureVoicesLoaded()

function findBestVoice(lang) {
  if (!voicesLoaded && window.speechSynthesis) {
    window.speechSynthesis.getVoices()
  }
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : []
  if (voices.length === 0) return null

  const exactMatch = voices.find(v => v.lang === lang)
  if (exactMatch) return exactMatch

  const langPrefix = lang.split('-')[0].toLowerCase()
  const prefixMatch = voices.find(v => v.lang.split('-')[0].toLowerCase() === langPrefix)
  if (prefixMatch) return prefixMatch

  return null
}

function speakText(text, sourceLang = 'en', slow = false) {
  if (!text || !('speechSynthesis' in window)) return

  const doSpeak = () => {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    if (SPEECH_LANG_MAP[sourceLang]) {
      u.lang = SPEECH_LANG_MAP[sourceLang]
    } else if (sourceLang.includes('-')) {
      u.lang = sourceLang
    } else {
      u.lang = sourceLang + '-' + sourceLang.toUpperCase()
    }
    u.rate = slow ? 0.6 : 1.0

    const voice = findBestVoice(u.lang)
    if (voice) {
      u.voice = voice
    }

    u.onerror = (e) => {
      if (e.error !== 'canceled') {
        console.warn('Speech error:', e.error)
      }
    }

    window.speechSynthesis.speak(u)
  }

  if (voicesLoaded) {
    doSpeak()
  } else {
    ensureVoicesLoaded().then(doSpeak)
  }
}

export { SPEECH_LANG_MAP as LANG_MAP, speakText }
