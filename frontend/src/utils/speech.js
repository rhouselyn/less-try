const SPEECH_LANG_MAP = {
  'en': 'en-US',
  'fr': 'fr-FR',
  'pt': 'pt-BR',
  'de': 'de-DE',
  'ro': 'ro-RO',
  'sv': 'sv-SE',
  'da': 'da-DK',
  'bg': 'bg-BG',
  'ru': 'ru-RU',
  'cs': 'cs-CZ',
  'el': 'el-GR',
  'uk': 'uk-UA',
  'es': 'es-ES',
  'nl': 'nl-NL',
  'sk': 'sk-SK',
  'hr': 'hr-HR',
  'pl': 'pl-PL',
  'lt': 'lt-LT',
  'nb': 'nb-NO',
  'nn': 'nn-NO',
  'fa': 'fa-IR',
  'sl': 'sl-SI',
  'gu': 'gu-IN',
  'lv': 'lv-LV',
  'it': 'it-IT',
  'oc': 'oc-FR',
  'ne': 'ne-NP',
  'mr': 'mr-IN',
  'be': 'be-BY',
  'sr': 'sr-RS',
  'lb': 'lb-LU',
  'vec': 'it-IT',
  'as': 'as-IN',
  'cy': 'cy-GB',
  'szl': 'pl-PL',
  'ast': 'ast-ES',
  'hne': 'hi-IN',
  'awa': 'hi-IN',
  'mai': 'mai-IN',
  'bho': 'bho-IN',
  'sd': 'sd-PK',
  'ga': 'ga-IE',
  'fo': 'fo-FO',
  'hi': 'hi-IN',
  'pa': 'pa-IN',
  'bn': 'bn-IN',
  'or': 'or-IN',
  'tg': 'tg-TJ',
  'yi': 'yi-US',
  'lmo': 'it-IT',
  'lij': 'it-IT',
  'scn': 'it-IT',
  'fur': 'it-IT',
  'sc': 'sc-IT',
  'gl': 'gl-ES',
  'ca': 'ca-ES',
  'is': 'is-IS',
  'sq': 'sq-AL',
  'li': 'li-NL',
  'prs': 'fa-AF',
  'af': 'af-ZA',
  'mk': 'mk-MK',
  'si': 'si-LK',
  'ur': 'ur-PK',
  'mag': 'hi-IN',
  'bs': 'bs-BA',
  'hy': 'hy-AM',
  'zh': 'zh-CN',
  'zh-TW': 'zh-TW',
  'yue': 'yue-CN',
  'my': 'my-MM',
  'ar': 'ar-SA',
  'ars': 'ar-SA',
  'apc': 'ar-SY',
  'arz': 'ar-EG',
  'ary': 'ar-MA',
  'acm': 'ar-IQ',
  'acq': 'ar-YE',
  'aeb': 'ar-TN',
  'he': 'he-IL',
  'mt': 'mt-MT',
  'id': 'id-ID',
  'ms': 'ms-MY',
  'tl': 'tl-PH',
  'ceb': 'ceb-PH',
  'jv': 'jv-ID',
  'su': 'su-ID',
  'min': 'min-ID',
  'ban': 'ban-ID',
  'bjn': 'bjn-ID',
  'pag': 'pag-PH',
  'ilo': 'ilo-PH',
  'war': 'war-PH',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
  'ml': 'ml-IN',
  'tr': 'tr-TR',
  'az': 'az-AZ',
  'uz': 'uz-UZ',
  'kk': 'kk-KZ',
  'ba': 'ba-RU',
  'tt': 'tt-RU',
  'th': 'th-TH',
  'lo': 'lo-LA',
  'fi': 'fi-FI',
  'et': 'et-EE',
  'hu': 'hu-HU',
  'vi': 'vi-VN',
  'km': 'km-KH',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'ka': 'ka-GE',
  'eu': 'eu-ES',
  'ht': 'ht-HT',
  'pap': 'pap-AW',
  'kea': 'kea-CV',
  'tpi': 'tpi-PG',
  'sw': 'sw-KE',
}

let voicesLoaded = false
let voicesReadyPromise = null
let speechUnlocked = false

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

function warmupSpeech() {
  if (!('speechSynthesis' in window)) return

  const unlock = () => {
    if (speechUnlocked) return
    ensureVoicesLoaded().then(() => {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance('a')
      u.volume = 0.01
      u.rate = 10
      u.onend = () => {
        speechUnlocked = true
      }
      u.onerror = () => {}
      window.speechSynthesis.speak(u)
    })
  }

  document.addEventListener('click', unlock, { once: true })
  document.addEventListener('touchstart', unlock, { once: true })
  document.addEventListener('keydown', unlock, { once: true })
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
    u.rate = slow ? 0.6 : 1.15

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

export { SPEECH_LANG_MAP as LANG_MAP, speakText, warmupSpeech }
