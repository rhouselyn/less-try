const CJK_RANGES = [
  [0x4e00, 0x9fff],
  [0x3040, 0x309f],
  [0x30a0, 0x30ff],
  [0xac00, 0xd7af],
]

function isCJK(char) {
  const code = char.charCodeAt(0)
  return CJK_RANGES.some(([start, end]) => code >= start && code <= end)
}

function hasCJK(text) {
  if (!text) return false
  return [...text].some(c => isCJK(c))
}

function getGroupKey(word) {
  const w = word.word || ''
  const ipa = word.ipa || ''

  if (hasCJK(w)) {
    if (ipa && ipa.length > 1) {
      const cleaned = ipa.replace(/^[\/\[]+/, '').trim()
      if (cleaned.length > 0) {
        return cleaned[0].toUpperCase()
      }
    }
    return w[0]
  }

  if (w.length > 0) {
    const first = w[0]
    return first.normalize('NFD')[0].toUpperCase()
  }

  return '#'
}

function groupVocab(vocab) {
  const groups = {}
  vocab.forEach(word => {
    const key = getGroupKey(word)
    if (!groups[key]) groups[key] = []
    groups[key].push(word)
  })
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

export { getGroupKey, groupVocab, hasCJK }
