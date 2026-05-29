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

let audioCtx = null
let currentSource = null

function getAudioContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) audioCtx = new AC()
  }
  return audioCtx
}

async function speakText(text, sourceLang = 'en', slow = false) {
  if (!text) return

  if (currentSource) {
    try { currentSource.stop() } catch (e) {}
    currentSource = null
  }

  const lang = LANG_MAP[sourceLang] || 'en'
  const url = `/api/tts?text=${encodeURIComponent(text)}&lang=${lang}${slow ? '&slow=true' : ''}`

  const ctx = getAudioContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    await ctx.resume()
  }

  const response = await fetch(url)
  if (!response.ok) return
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  const source = ctx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(ctx.destination)
  source.start(0)
  currentSource = source
  source.onended = () => { if (currentSource === source) currentSource = null }
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
