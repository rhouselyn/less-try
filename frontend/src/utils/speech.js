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
  const u = new SpeechSynthesisUtterance(text)
  u.lang = SPEECH_LANG_MAP[sourceLang] || 'en-US'
  u.rate = slow ? 0.6 : 1.0
  window.speechSynthesis.speak(u)
}

export { SPEECH_LANG_MAP as LANG_MAP, speakText }
