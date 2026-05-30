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

function speakText(text, sourceLang = 'en', slow = false) {
  if (!text || !('speechSynthesis' in window)) return
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
  window.speechSynthesis.speak(u)
}

export { SPEECH_LANG_MAP as LANG_MAP, speakText }
