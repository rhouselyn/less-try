const LANG_MAP = {
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

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio.onended = null
    currentAudio.onerror = null
    currentAudio = null
  }
}

function speakText(text, sourceLang = 'en') {
  if (typeof window === 'undefined' || !text) return

  stopCurrentAudio()

  const lang = sourceLang || 'en'
  const url = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`

  const audio = new Audio(url)
  audio.volume = 1
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
