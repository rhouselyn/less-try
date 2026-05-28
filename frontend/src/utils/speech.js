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

let currentAudio = null

function speakText(text, sourceLang = 'en') {
  if (!text) return

  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }

  const lang = LANG_MAP[sourceLang] || 'en'
  const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}&lang=${lang}`)
  currentAudio = audio

  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null
  }
  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null
  }

  audio.play().catch(() => {
    if (currentAudio === audio) currentAudio = null
  })
}

export { LANG_MAP, speakText }
