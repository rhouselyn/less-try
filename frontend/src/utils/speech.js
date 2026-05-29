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

let audioCtx = null
let currentSource = null
let ttsAvailable = true

function getAudioContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) audioCtx = new AC()
  }
  return audioCtx
}

function speakFallback(text, sourceLang = 'en', slow = false) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = SPEECH_LANG_MAP[sourceLang] || 'en-US'
  utterance.rate = slow ? 0.6 : 1.0
  window.speechSynthesis.speak(utterance)
}

async function speakText(text, sourceLang = 'en', slow = false) {
  if (!text) return

  if (currentSource) {
    try { currentSource.stop() } catch (e) {}
    currentSource = null
  }

  if (!ttsAvailable) {
    speakFallback(text, sourceLang, slow)
    return
  }

  const lang = LANG_MAP[sourceLang] || 'en'
  const url = `/api/tts?text=${encodeURIComponent(text)}&lang=${lang}${slow ? '&slow=true' : ''}`

  try {
    const ctx = getAudioContext()
    if (!ctx) throw new Error('No AudioContext')

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    const response = await fetch(url)
    if (!response.ok) throw new Error('TTS request failed')
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    source.start(0)
    currentSource = source
    source.onended = () => { if (currentSource === source) currentSource = null }
  } catch (e) {
    ttsAvailable = false
    speakFallback(text, sourceLang, slow)
  }
}

if (typeof document !== 'undefined') {
  const unlock = () => {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') ctx.resume()
  }
  ;['click', 'touchstart', 'keydown'].forEach(evt =>
    document.addEventListener(evt, unlock, { once: true })
  )
}

export { LANG_MAP, speakText }
