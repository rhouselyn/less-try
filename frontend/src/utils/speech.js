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

function speakText(text, sourceLang = 'en', slow = false) {
  if (!text || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = SPEECH_LANG_MAP[sourceLang] || 'en-US'
  utterance.rate = slow ? 0.6 : 1.0
  window.speechSynthesis.speak(utterance)
}

export { SPEECH_LANG_MAP as LANG_MAP, speakText }
