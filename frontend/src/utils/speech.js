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

let audioContext = null
let currentSource = null
let currentGain = null

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

function stopCurrentAudio() {
  if (currentSource) {
    try { currentSource.stop() } catch (e) {}
    currentSource = null
  }
}

function speakText(text, sourceLang = 'en') {
  if (typeof window === 'undefined' || !text) return

  stopCurrentAudio()

  const lang = sourceLang || 'en'
  const url = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('TTS request failed')
      return res.arrayBuffer()
    })
    .then(arrayBuffer => {
      const ctx = getAudioContext()
      return ctx.decodeAudioData(arrayBuffer)
    })
    .then(audioBuffer => {
      const ctx = getAudioContext()
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      currentSource = source
      source.onended = () => {
        if (currentSource === source) currentSource = null
      }
      source.start(0)
    })
    .catch(() => {
      const audio = new Audio(url)
      audio.volume = 1
      audio.play().catch(() => {})
    })
}

export { LANG_MAP, speakText }
