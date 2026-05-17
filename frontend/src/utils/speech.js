const LANG_MAP = {
  'en': 'en-US',
  'zh': 'zh-CN',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'es': 'es-ES',
  'it': 'it-IT',
  'pt': 'pt-PT',
  'ru': 'ru-RU',
}

let voicesLoaded = false

if ('speechSynthesis' in window) {
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      voicesLoaded = true
    }
  }
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

function speakText(text, sourceLang = 'en') {
  if (!('speechSynthesis' in window)) return

  window.speechSynthesis.cancel()

  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = LANG_MAP[sourceLang] || 'en-US'
    utterance.rate = 0.9

    const voices = window.speechSynthesis.getVoices()
    const targetLang = LANG_MAP[sourceLang] || 'en-US'
    const langPrefix = targetLang.split('-')[0]
    const matchedVoice = voices.find(v => v.lang.startsWith(langPrefix))
    if (matchedVoice) {
      utterance.voice = matchedVoice
    }

    window.speechSynthesis.speak(utterance)
  }

  if (voicesLoaded) {
    speak()
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      voicesLoaded = true
      speak()
    }
    window.speechSynthesis.getVoices()
    setTimeout(speak, 200)
  }
}

export { LANG_MAP, speakText }
