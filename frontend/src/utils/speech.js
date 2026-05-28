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
let currentAudioEl = null

async function getAudioContext() {
  if (!audioContext) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    audioContext = new AC()
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
  return audioContext
}

function stopCurrentAudio() {
  if (currentSource) {
    try { currentSource.stop() } catch (e) {}
    currentSource = null
  }
  if (currentAudioEl) {
    try {
      currentAudioEl.pause()
      currentAudioEl.currentTime = 0
    } catch (e) {}
    currentAudioEl.onended = null
    currentAudioEl.onerror = null
    currentAudioEl = null
  }
}

async function playWithAudioContext(arrayBuffer) {
  const ctx = await getAudioContext()
  if (!ctx) return false
  try {
    const audioBuffer = await new Promise((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject)
    })
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    currentSource = source
    source.onended = () => {
      if (currentSource === source) currentSource = null
    }
    source.start(0)
    return true
  } catch (e) {
    return false
  }
}

function playWithAudioElement(arrayBuffer) {
  return new Promise((resolve) => {
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    audio.preload = 'auto'
    audio.volume = 1
    currentAudioEl = audio

    let resolved = false
    const done = (result) => {
      if (resolved) return
      resolved = true
      URL.revokeObjectURL(url)
      resolve(result)
    }

    const timeout = setTimeout(() => done(false), 8000)

    audio.oncanplaythrough = () => {
      clearTimeout(timeout)
      audio.play().then(() => done(true)).catch(() => done(false))
    }

    audio.onerror = () => {
      clearTimeout(timeout)
      done(false)
    }

    audio.onended = () => {
      if (currentAudioEl === audio) currentAudioEl = null
    }

    audio.src = url
    audio.load()
  })
}

async function speakText(text, sourceLang = 'en') {
  if (typeof window === 'undefined' || !text) return

  stopCurrentAudio()

  const lang = sourceLang || 'en'

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
    })
    if (!res.ok) throw new Error('TTS failed')
    const arrayBuffer = await res.arrayBuffer()

    const ok = await playWithAudioContext(arrayBuffer)
    if (ok) return

    await playWithAudioElement(arrayBuffer)
  } catch (e) {}
}

export { LANG_MAP, speakText }
