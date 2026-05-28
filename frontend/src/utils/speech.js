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

let voicesLoaded = false
let voicesReadyPromise = null

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      voicesLoaded = true
    }
  }
  loadVoices()

  voicesReadyPromise = new Promise((resolve) => {
    if (voicesLoaded) {
      resolve()
      return
    }
    const handler = () => {
      voicesLoaded = true
      resolve()
    }
    window.speechSynthesis.onvoiceschanged = handler
    setTimeout(() => {
      loadVoices()
      resolve()
    }, 2000)
  })
}

function createUtterance(text, sourceLang) {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = LANG_MAP[sourceLang] || 'en-US'
  utterance.rate = 0.9
  utterance.volume = 1

  const voices = window.speechSynthesis.getVoices()
  const targetLang = LANG_MAP[sourceLang] || 'en-US'
  const langPrefix = targetLang.split('-')[0]
  const exactMatch = voices.find(v => v.lang === targetLang)
  const langMatch = voices.find(v => v.lang.startsWith(langPrefix))
  if (exactMatch) {
    utterance.voice = exactMatch
  } else if (langMatch) {
    utterance.voice = langMatch
  }

  utterance.onerror = (e) => {
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      console.warn('Speech synthesis error:', e.error)
    }
  }

  return utterance
}

function speakText(text, sourceLang = 'en') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  if (!text) return

  const isCurrentlySpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending

  if (isCurrentlySpeaking) {
    window.speechSynthesis.cancel()
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(createUtterance(text, sourceLang))
      } catch (e) {
        console.warn('Speech synthesis failed:', e)
      }
    }, 300)
  } else {
    if (!voicesLoaded && voicesReadyPromise) {
      voicesReadyPromise.then(() => {
        try {
          window.speechSynthesis.speak(createUtterance(text, sourceLang))
        } catch (e) {
          console.warn('Speech synthesis failed:', e)
        }
      })
    } else {
      try {
        window.speechSynthesis.speak(createUtterance(text, sourceLang))
      } catch (e) {
        console.warn('Speech synthesis failed:', e)
      }
    }
  }
}

export { LANG_MAP, speakText }
