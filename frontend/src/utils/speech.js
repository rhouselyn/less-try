// Edge TTS 语音合成（通过后端 API）
// 所有 TTS 统一走后端 Edge TTS，确保声音稳定一致

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

let currentAudio = null

function warmupSpeech() {
  // Edge TTS 不需要浏览器端预热，保留空函数以兼容
}

function speakText(text, sourceLang = 'en', slow = false) {
  if (!text) return

  // 停止当前播放
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
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
    console.warn('Edge TTS playback error')
  }

  audio.play().catch(() => {})
}

export { SPEECH_LANG_MAP as LANG_MAP, speakText, warmupSpeech }
