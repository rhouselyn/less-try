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
let currentUtterance = null

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
    }, 1000)
  })
}

function speakText(text, sourceLang = 'en') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  if (!text) return

  window.speechSynthesis.cancel()
  currentUtterance = null

  const doSpeak = () => {
    try {
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
        if (e.error !== 'canceled') {
          console.warn('Speech synthesis error:', e.error)
        }
      }

      currentUtterance = utterance
      window.speechSynthesis.speak(utterance)

      const resumeInterval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(resumeInterval)
          return
        }
        window.speechSynthesis.resume()
      }, 5000)
      utterance.onend = () => {
        clearInterval(resumeInterval)
        currentUtterance = null
      }
      utterance.onerror = (e) => {
        clearInterval(resumeInterval)
        if (e.error !== 'canceled') {
          currentUtterance = null
        }
      }
    } catch (e) {
      console.warn('Speech synthesis failed:', e)
    }
  }

  if (voicesLoaded) {
    doSpeak()
  } else if (voicesReadyPromise) {
    voicesReadyPromise.then(doSpeak)
  } else {
    setTimeout(doSpeak, 300)
  }
}

export { LANG_MAP, speakText }
