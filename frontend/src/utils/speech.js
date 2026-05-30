function speakText(text, sourceLang = 'en', slow = false) {
  if (!text || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = sourceLang || 'en'
  u.rate = slow ? 0.6 : 1.0
  window.speechSynthesis.speak(u)
}

export { speakText }
