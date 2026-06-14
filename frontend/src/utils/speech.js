// TTS 语音合成：优先使用后端 Edge TTS，失败时 fallback 到浏览器 Web Speech API
// Edge TTS 声音稳定一致，Web Speech API 作为离线/网络受限时的备选

const SPEECH_LANG_MAP = {
  'en': 'en',
  'fr': 'fr',
  'pt': 'pt',
  'de': 'de',
  'ro': 'ro',
  'sv': 'sv',
  'da': 'da',
  'bg': 'bg',
  'ru': 'ru',
  'cs': 'cs',
  'el': 'el',
  'uk': 'uk',
  'es': 'es',
  'nl': 'nl',
  'sk': 'sk',
  'hr': 'hr',
  'pl': 'pl',
  'lt': 'lt',
  'nb': 'nb',
  'nn': 'nb',
  'fa': 'fa',
  'sl': 'sl',
  'gu': 'gu',
  'lv': 'lv',
  'it': 'it',
  'oc': 'fr',
  'ne': 'ne',
  'mr': 'mr',
  'be': 'be',
  'sr': 'sr',
  'lb': 'lb',
  'vec': 'it',
  'as': 'as',
  'cy': 'cy',
  'szl': 'pl',
  'ast': 'es',
  'hne': 'hi',
  'awa': 'hi',
  'mai': 'mai',
  'bho': 'bho',
  'sd': 'sd',
  'ga': 'ga',
  'fo': 'fo',
  'hi': 'hi',
  'pa': 'pa',
  'bn': 'bn',
  'or': 'or',
  'tg': 'tg',
  'yi': 'yi',
  'lmo': 'it',
  'lij': 'it',
  'scn': 'it',
  'fur': 'it',
  'sc': 'it',
  'gl': 'gl',
  'ca': 'ca',
  'is': 'is',
  'sq': 'sq',
  'li': 'nl',
  'prs': 'fa',
  'af': 'af',
  'mk': 'mk',
  'si': 'si',
  'ur': 'ur',
  'mag': 'hi',
  'bs': 'bs',
  'hy': 'hy',
  'zh': 'zh',
  'zh-TW': 'zh',
  'yue': 'zh',
  'my': 'my',
  'ar': 'ar',
  'ars': 'ar',
  'apc': 'ar',
  'arz': 'ar',
  'ary': 'ar',
  'acm': 'ar',
  'acq': 'ar',
  'aeb': 'ar',
  'he': 'he',
  'mt': 'mt',
  'id': 'id',
  'ms': 'ms',
  'tl': 'fil',
  'ceb': 'fil',
  'jv': 'id',
  'su': 'id',
  'min': 'id',
  'ban': 'id',
  'bjn': 'id',
  'pag': 'fil',
  'ilo': 'fil',
  'war': 'fil',
  'ta': 'ta',
  'te': 'te',
  'kn': 'kn',
  'ml': 'ml',
  'tr': 'tr',
  'az': 'az',
  'uz': 'uz',
  'kk': 'kk',
  'ba': 'ru',
  'tt': 'ru',
  'th': 'th',
  'lo': 'lo',
  'fi': 'fi',
  'et': 'et',
  'hu': 'hu',
  'vi': 'vi',
  'km': 'km',
  'ja': 'ja',
  'ko': 'ko',
  'ka': 'ka',
  'eu': 'eu',
  'ht': 'ht',
  'pap': 'nl',
  'kea': 'pt',
  'tpi': 'en',
  'sw': 'sw',
}

// Web Speech API 语言映射（用于 fallback）
const BROWSER_LANG_MAP = {
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
  'it': 'it-IT',
  'hi': 'hi-IN',
  'zh': 'zh-CN',
  'zh-TW': 'zh-TW',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'ar': 'ar-SA',
  'he': 'he-IL',
  'th': 'th-TH',
  'vi': 'vi-VN',
  'tr': 'tr-TR',
  'id': 'id-ID',
  'ms': 'ms-MY',
  'ta': 'ta-IN',
  'te': 'te-IN',
  'kn': 'kn-IN',
  'ml': 'ml-IN',
  'bn': 'bn-IN',
  'pa': 'pa-IN',
  'ur': 'ur-PK',
  'gu': 'gu-IN',
  'hu': 'hu-HU',
  'fi': 'fi-FI',
  'et': 'et-EE',
  'my': 'my-MM',
  'ka': 'ka-GE',
  'ca': 'ca-ES',
}

let currentAudio = null
let edgeTtsAvailable = null // null=未检测, true=可用, false=不可用
let speakSeq = 0 // 请求序列号，用于判断是否还是当前请求

function warmupSpeech() {
  // Edge TTS 不需要浏览器端预热
}

// Fallback: 浏览器 Web Speech API
function speakTextBrowser(text, sourceLang = 'en', slow = false) {
  if (!text || !('speechSynthesis' in window)) return

  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const browserLang = BROWSER_LANG_MAP[sourceLang] || sourceLang
  u.lang = browserLang
  u.rate = slow ? 0.6 : 1

  const voices = window.speechSynthesis.getVoices()
  const voice = voices.find(v => v.lang === browserLang) || voices.find(v => v.lang.split('-')[0].toLowerCase() === sourceLang.split('-')[0].toLowerCase())
  if (voice) u.voice = voice

  u.onerror = (e) => {
    if (e.error !== 'canceled') console.warn('Web Speech error:', e.error)
  }
  window.speechSynthesis.speak(u)
}

function speakText(text, sourceLang = 'en', slow = false) {
  if (!text) return

  // 递增序列号，使旧请求的回调失效
  const seq = ++speakSeq

  // 停止当前播放
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }

  // 如果 Edge TTS 已确认不可用，直接用浏览器 TTS
  if (edgeTtsAvailable === false) {
    speakTextBrowser(text, sourceLang, slow)
    return
  }

  const lang = SPEECH_LANG_MAP[sourceLang] || sourceLang.split('-')[0].toLowerCase() || 'en'
  const url = `/api/tts/speak?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}&slow=${slow ? 'true' : 'false'}`

  const audio = new Audio(url)
  currentAudio = audio

  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null
  }
  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null
    // 标记 Edge TTS 不可用，后续直接用浏览器 TTS
    edgeTtsAvailable = false
    // 只有当前请求还是最新的，才 fallback 播放
    if (seq === speakSeq) {
      speakTextBrowser(text, sourceLang, slow)
    }
  }

  audio.play().catch(() => {
    if (currentAudio === audio) currentAudio = null
    edgeTtsAvailable = false
    if (seq === speakSeq) {
      speakTextBrowser(text, sourceLang, slow)
    }
  })
}

export { SPEECH_LANG_MAP as LANG_MAP, speakText, warmupSpeech }
