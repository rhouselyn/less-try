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

let currentUtterance = null
let speakTimer = null
let voices = []
let voicesLoaded = false
let keepAliveTimer = null

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) voicesLoaded = true

  window.speechSynthesis.onvoiceschanged = () => {
    voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) voicesLoaded = true
  }

  keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.resume()
    }
  }, 10000)
}

function playWithAudioElement(text, sourceLang) {
  try {
    const lang = (LANG_MAP[sourceLang] || 'en-US').split('-')[0]
    const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`)
    audio.volume = 1
    audio.play().catch(() => {})
  } catch (e) {}
}

function speakText(text, sourceLang = 'en') {
  if (typeof window === 'undefined' || !text) return

  if (speakTimer) {
    clearTimeout(speakTimer)
    speakTimer = null
  }

  if (!('speechSynthesis' in window)) {
    playWithAudioElement(text, sourceLang)
    return
  }

  if (currentUtterance) {
    currentUtterance._cancelled = true
    currentUtterance.onend = null
    currentUtterance.onerror = null
    currentUtterance = null
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = LANG_MAP[sourceLang] || 'en-US'
  utterance.rate = 0.9
  utterance.volume = 1

  if (voicesLoaded && voices.length > 0) {
    const targetLang = LANG_MAP[sourceLang] || 'en-US'
    const langPrefix = targetLang.split('-')[0]
    const voice = voices.find(v => v.lang === targetLang) || voices.find(v => v.lang.startsWith(langPrefix))
    if (voice) utterance.voice = voice
  }

  currentUtterance = utterance

  utterance.onend = () => {
    if (currentUtterance === utterance) currentUtterance = null
  }

  utterance.onerror = (e) => {
    if (currentUtterance === utterance) currentUtterance = null
    if (utterance._cancelled) return
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      console.warn('Speech synthesis error:', e.error)
    }
    if (e.error === 'not-allowed' || e.error === 'audio-busy' || e.error === 'network') {
      playWithAudioElement(text, sourceLang)
    }
  }

  speakTimer = setTimeout(() => {
    speakTimer = null
    try {
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      playWithAudioElement(text, sourceLang)
    }
  }, 100)
}

export { LANG_MAP, speakText }
