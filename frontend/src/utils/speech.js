const LANG_MAP = {
  'en': 'en',
  'zh': 'zh',
  'ja': 'ja',
  'ko': 'ko',
  'fr': 'fr',
  'de': 'de',
  'es': 'es',
  'it': 'it',
  'pt': 'pt',
  'ru': 'ru',
}

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
}

let currentAudio = null
let ttsAvailable = true

function speakFallback(text, sourceLang = 'en', slow = false) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = SPEECH_LANG_MAP[sourceLang] || 'en-US'
  utterance.rate = slow ? 0.6 : 1.0
  window.speechSynthesis.speak(utterance)
}

function speakText(text, sourceLang = 'en', slow = false) {
  if (!text) return

  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }

  if (!ttsAvailable) {
    speakFallback(text, sourceLang, slow)
    return
  }

  const lang = LANG_MAP[sourceLang] || 'en'
  const url = `/api/tts?text=${encodeURIComponent(text)}&lang=${lang}${slow ? '&slow=true' : ''}`
  const audio = new Audio(url)
  currentAudio = audio

  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null
  }
  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null
    ttsAvailable = false
    speakFallback(text, sourceLang, slow)
  }

  audio.play().catch((e) => {
    if (currentAudio === audio) currentAudio = null
    if (e.name === 'NotAllowedError') return
    ttsAvailable = false
    speakFallback(text, sourceLang, slow)
  })
}

export { LANG_MAP, speakText }
