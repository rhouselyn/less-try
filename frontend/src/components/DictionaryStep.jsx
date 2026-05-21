import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shuffle, Loader2, Languages, BookOpen, Search, Volume2, EyeOff } from 'lucide-react'
import WordDetail from './WordDetail'
import SentenceDetail from './SentenceDetail'
import { groupVocab } from '../utils/vocab'
import { speakText } from '../utils/speech'

function DictionaryStep({ vocab, onToggleSort, sortOrder, progress, processingInfo, sentenceTranslations, selectedSentence, selectedWord, onSentenceClick, onCloseSentenceDetail, onWordClick, onStartLearning, loading, t, currentFileId, sourceLang, preprocessStatus }) {
  const [expandedWord, setExpandedWord] = useState(null)
  const [wordDetailCache, setWordDetailCache] = useState({})
  const [loadingWords, setLoadingWords] = useState({})
  const [wordDetails, setWordDetails] = useState({})
  const [sentenceSearch, setSentenceSearch] = useState('')
  const [vocabSearch, setVocabSearch] = useState('')
  const [hideTranslations, setHideTranslations] = useState(false)
  const [hideMeanings, setHideMeanings] = useState(false)
  const vocabListRef = useRef(null)
  const wordRefs = useRef({})
  const sentenceRefs = useRef({})

  const safeSentenceTranslations = Array.isArray(sentenceTranslations) ? sentenceTranslations : []
  const safeProcessingInfo = processingInfo || { current: 0, total: 1 }

  const filteredSentences = useMemo(() => {
    if (!sentenceSearch.trim()) return safeSentenceTranslations
    const q = sentenceSearch.toLowerCase()
    return safeSentenceTranslations.filter(item => {
      const sentence = (item.sentence || '').toLowerCase()
      const translation = (item.translation_result?.tokenized_translation || '').toLowerCase()
      const tokens = item.translation_result?.translation || []
      const tokenTexts = tokens.filter(t => typeof t === 'object' && t.text).map(t => t.text.toLowerCase()).join(' ')
      return sentence.includes(q) || translation.includes(q) || tokenTexts.includes(q)
    })
  }, [safeSentenceTranslations, sentenceSearch])

  const filteredVocab = useMemo(() => {
    if (!vocabSearch.trim()) return vocab
    const q = vocabSearch.toLowerCase()
    return vocab.filter(w =>
      w.word.toLowerCase().includes(q) ||
      (w.enriched_meaning && w.enriched_meaning.toLowerCase().includes(q)) ||
      (w.context_meaning && w.context_meaning.toLowerCase().includes(q)) ||
      (w.translation && w.translation.toLowerCase().includes(q))
    )
  }, [vocab, vocabSearch])

  const groupedVocab = useMemo(() => {
    return groupVocab(filteredVocab)
  }, [filteredVocab])

  const letterIndex = useMemo(() => {
    return groupedVocab.map(([letter]) => letter)
  }, [groupedVocab])

  const scrollToLetter = (letter) => {
    const el = document.getElementById(`dict-group-${letter}`)
    if (el && vocabListRef.current) {
      const container = vocabListRef.current
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const stickyOffset = 32
      const scrollOffset = elRect.top - containerRect.top + container.scrollTop - stickyOffset
      container.scrollTo({ top: scrollOffset, behavior: 'smooth' })
    }
  }

  const fetchWordDetail = useCallback(async (wordKey) => {
    if (wordDetails[wordKey]) return wordDetails[wordKey]
    if (wordDetailCache[wordKey]) {
      setWordDetails(prev => ({ ...prev, [wordKey]: wordDetailCache[wordKey] }))
      return wordDetailCache[wordKey]
    }

    setLoadingWords(prev => ({ ...prev, [wordKey]: true }))
    try {
      try {
        await fetch(`/api/learn/${currentFileId}/priority-word-gen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: wordKey })
        })
      } catch (_) {}

      const waitForDetail = async (retries = 30) => {
        const response = await fetch(`/api/word/${currentFileId}/${wordKey}`)
        const data = await response.json()
        if (data && (data.enriched_meaning || data.meaning || data.multiple_choice)) {
          return data
        }
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 2000))
          return waitForDetail(retries - 1)
        }
        return data
      }

      const data = await waitForDetail()
      setWordDetails(prev => ({ ...prev, [wordKey]: data }))
      setWordDetailCache(prev => ({ ...prev, [wordKey]: data }))
      return data
    } catch (e) {
      console.error('Failed to load word details:', e)
      return null
    } finally {
      setLoadingWords(prev => ({ ...prev, [wordKey]: false }))
    }
  }, [currentFileId, wordDetails, wordDetailCache])

  const scrollToWord = useCallback((wordKey, delay = 100) => {
    setTimeout(() => {
      const el = wordRefs.current[wordKey]
      if (el && vocabListRef.current) {
        const container = vocabListRef.current
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const stickyOffset = 32
        const scrollOffset = elRect.top - containerRect.top + container.scrollTop - stickyOffset
        container.scrollTo({ top: scrollOffset, behavior: 'smooth' })
      }
    }, delay)
  }, [])

  const handleTokenClick = useCallback(async (sourceWord) => {
    const sourceLower = sourceWord.toLowerCase()
    const sourceNoHyphen = sourceLower.replace(/-/g, ' ')
    const matchedWord = vocab.find(w => {
      const wordLower = w.word.toLowerCase()
      if (wordLower === sourceLower) return true
      if (wordLower === sourceNoHyphen) return true
      if (wordLower.replace(/-/g, ' ') === sourceLower) return true
      if (w.tokens && w.tokens.some(t => t.toLowerCase() === sourceLower)) return true
      return false
    })

    if (!matchedWord) return

    const wordKey = matchedWord.word
    if (expandedWord === wordKey) {
      setExpandedWord(null)
      return
    }
    setExpandedWord(wordKey)
    scrollToWord(wordKey, 100)
    const detail = await fetchWordDetail(wordKey)
    if (detail) {
      scrollToWord(wordKey, 300)
    }
  }, [vocab, expandedWord, scrollToWord, fetchWordDetail])

  const handleVocabWordClick = useCallback(async (word) => {
    const wordKey = word.word
    if (expandedWord === wordKey) {
      setExpandedWord(null)
      return
    }
    setExpandedWord(wordKey)
    scrollToWord(wordKey, 100)
    const detail = await fetchWordDetail(wordKey)
    if (detail) {
      scrollToWord(wordKey, 300)
    }
  }, [expandedWord, fetchWordDetail, scrollToWord])

  const handleSentenceJump = useCallback((sentenceIndex) => {
    onSentenceClick(sentenceIndex)
    setTimeout(() => {
      const el = sentenceRefs.current[sentenceIndex]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 300)
  }, [onSentenceClick])

  const speakWord = useCallback((text, e) => {
    if (e) e.stopPropagation()
    speakText(text, sourceLang)
  }, [sourceLang])

  const findVocabWordBySourceText = useCallback((sourceText) => {
    const sourceLower = sourceText.toLowerCase()
    const sourceNoHyphen = sourceLower.replace(/-/g, ' ')
    return vocab.some(w => {
      const wordLower = w.word.toLowerCase()
      if (wordLower === sourceLower) return true
      if (wordLower === sourceNoHyphen) return true
      if (wordLower.replace(/-/g, ' ') === sourceLower) return true
      if (w.tokens && w.tokens.some(t => t.toLowerCase() === sourceLower)) return true
      return false
    })
  }, [vocab])

  const renderOriginalSentence = (item) => {
    const sentence = item.sentence || ''
    const tr = item.translation_result
    const tokens = (tr && tr.translation && Array.isArray(tr.translation)) ? tr.translation : null

    const tokenTexts = tokens
      ? tokens.filter(t => typeof t === 'object' && t.text).map(t => t.text)
      : []

    const vocabTexts = vocab.map(w => w.word).filter(Boolean)

    const allWords = [...new Set([...tokenTexts, ...vocabTexts])]
    if (allWords.length === 0) {
      return <div className="font-medium text-stone-800 mb-1.5">{sentence}</div>
    }

    allWords.sort((a, b) => b.length - a.length)

    const escapedWords = allWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const pattern = new RegExp(`(${escapedWords.join('|')})`, 'gi')
    const parts = sentence.split(pattern)

    return (
      <div className="font-medium text-stone-800 mb-1.5 leading-relaxed">
        {parts.map((part, i) => {
          if (!part) return null
          const clickable = findVocabWordBySourceText(part)
          if (clickable) {
            return (
              <span
                key={i}
                onClick={(e) => { e.stopPropagation(); handleTokenClick(part) }}
                className="cursor-pointer rounded px-0.5 -mx-0.5 hover:bg-amber-100 hover:text-amber-800 transition-colors duration-150 border-b border-amber-300/50"
              >
                {part}
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </div>
    )
  }

  const renderTranslation = (item) => {
    const tr = item.translation_result
    const text = tr?.tokenized_translation || ''
    if (!text) return null
    return <div className={`text-stone-600 text-sm ${hideTranslations ? 'invisible' : ''}`}>{text}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      {processingInfo && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-stone-600">{t.processing}: 句子 {safeProcessingInfo.current} / {safeProcessingInfo.total}</span>
            <span className="text-sm text-stone-600">{progress}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2.5">
            <div
              className="bg-stone-800 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {!processingInfo && loading && !preprocessStatus && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-stone-600">{t.processing}: 句子 0 / ...</span>
            <span className="text-sm text-stone-600">0%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2.5">
            <div className="bg-stone-800 h-2.5 rounded-full transition-all duration-300" style={{ width: '0%' }}></div>
          </div>
        </div>
      )}

      {preprocessStatus && (
        <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-sm text-blue-700 font-medium">
              {preprocessStatus === 'translating' ? (t.translating || '翻译中...') : (t.generating || '生成文本中...')}
            </span>
          </div>
        </div>
      )}

      {!processingInfo && !preprocessStatus && vocab.length > 0 && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onStartLearning}
          disabled={loading}
          className="w-full py-4 bg-stone-800 text-white font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t.preparing}
            </>
          ) : (
            <>
              <Shuffle className="w-5 h-5" />
              开始学习
            </>
          )}
        </motion.button>
      )}

      <div className="flex gap-6" style={{ minHeight: '70vh' }}>
        <div className="w-1/2 flex flex-col">
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="px-5 py-3.5 border-b border-stone-200/80 bg-stone-50/60">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <Languages className={`w-4 h-4 transition-colors cursor-pointer ${hideTranslations ? 'text-amber-500' : 'text-stone-500 hover:text-amber-500'}`} onClick={(e) => { e.stopPropagation(); setHideTranslations(v => !v) }} />
                  <h3 className="text-sm font-semibold text-stone-700">{t.sentTranslation}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {filteredSentences.length}
                  </span>
                </div>
                <div className="relative w-1/2 ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" />
                  <input
                    type="text"
                    value={sentenceSearch}
                    onChange={e => setSentenceSearch(e.target.value)}
                    placeholder="搜索单词或释义..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200/80 rounded-lg text-[13px] text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-200/60 focus:border-amber-300/60 transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {filteredSentences.length > 0 ? (
                <div className="divide-y divide-stone-200/60">
                  {filteredSentences.map((item, index) => {
                    const originalIndex = safeSentenceTranslations.indexOf(item)
                    return (
                      <div key={originalIndex} ref={el => { sentenceRefs.current[originalIndex] = el }}>
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedSentence === originalIndex ? 'bg-amber-50/60' : 'hover:bg-amber-50/30'
                          }`}
                          onClick={() => onSentenceClick(originalIndex)}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              {renderOriginalSentence(item)}
                              {renderTranslation(item)}
                            </div>
                            <Volume2 className="w-3.5 h-3.5 text-stone-300 hover:text-amber-600 shrink-0 mt-1 transition-colors" onClick={(e) => speakWord(item.sentence || '', e)} />
                          </div>
                        </motion.div>
                        {selectedSentence === originalIndex && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="border-t border-stone-200/60 p-4 bg-stone-50/50"
                          >
                            <SentenceDetail
                              sentenceTranslation={safeSentenceTranslations[originalIndex]}
                              t={t}
                            />
                          </motion.div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <Languages className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                  <p className="text-stone-400 text-sm">{sentenceSearch ? '没有找到匹配的句子' : t.loading}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="px-5 py-3.5 border-b border-stone-200/80 bg-stone-50/60">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <BookOpen className={`w-4 h-4 transition-colors cursor-pointer ${hideMeanings ? 'text-amber-500' : 'text-stone-500 hover:text-amber-500'}`} onClick={(e) => { e.stopPropagation(); setHideMeanings(v => !v) }} />
                  <h3 className="text-sm font-semibold text-stone-700">{t.vocabList}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {filteredVocab.length}
                  </span>
                </div>
                <div className="relative w-1/2 ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" />
                  <input
                    type="text"
                    value={vocabSearch}
                    onChange={e => setVocabSearch(e.target.value)}
                    placeholder="搜索单词或释义..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200/80 rounded-lg text-[13px] text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-200/60 focus:border-amber-300/60 transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto" ref={vocabListRef} style={{ maxHeight: '70vh' }}>
              {groupedVocab.length === 0 ? (
                <div className="py-16 text-center">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                  <p className="text-stone-400 text-sm">{loading ? t.loading : (vocabSearch ? '没有找到匹配的单词' : t.loading)}</p>
                </div>
              ) : (
              <div className="space-y-3">
                {groupedVocab.map(([letter, words], groupIdx) => (
                  <div key={letter} id={`dict-group-${letter}`}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: groupIdx * 0.04 }}
                      className="sticky top-0 z-10 backdrop-blur-sm bg-stone-50/80 px-4 py-1.5 border-b border-stone-200/40 mb-1"
                    >
                      <span className="text-xs font-bold text-amber-600/80 tracking-widest">{letter}</span>
                    </motion.div>
                    <div className="space-y-px">
                      {words.map((word, index) => {
                        const wordKey = word.word
                        const isExpanded = expandedWord === wordKey
                        const isLoading = loadingWords[wordKey]
                        const detail = wordDetails[wordKey]

                        return (
                          <motion.div
                            key={wordKey}
                            ref={el => { wordRefs.current[wordKey] = el }}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: groupIdx * 0.03 + index * 0.015 }}
                            className="bg-white"
                          >
                            <button
                              onClick={() => handleVocabWordClick(word)}
                              className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-amber-50/40 transition-colors group"
                            >
                              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                <span className="text-[14px] font-semibold text-stone-800 tracking-tight shrink-0">
                                  {word.word}
                                </span>
                                {word.ipa && (
                                  <span className="text-[11px] text-stone-400 ipa-font shrink-0">
                                    {word.ipa.startsWith('/') ? word.ipa : `/${word.ipa}/`}
                                  </span>
                                )}
                                {word.morphology && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded font-medium tracking-wide shrink-0">
                                    {word.morphology}
                                  </span>
                                )}
                                <span className={`text-[12px] text-stone-500 truncate ${hideMeanings ? 'invisible' : ''}`}>
                                  {word.context_meaning || word.translation}
                                </span>
                              </div>
                              <Volume2
                                className="w-3.5 h-3.5 text-stone-300 hover:text-amber-600 shrink-0 transition-colors"
                                onClick={(e) => speakWord(word.word, e)}
                              />
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-3.5 border-t border-stone-100/80">
                                    {isLoading ? (
                                      <div className="pt-4 flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                                        <p className="text-[12px] text-stone-400">正在生成单词详解...</p>
                                      </div>
                                    ) : detail ? (
                                      <div className="pt-3">
                                        <WordDetail word={detail} t={t} onSentenceClick={handleSentenceJump} sourceLang={sourceLang} />
                                      </div>
                                    ) : (
                                      <div className="pt-3 text-center text-stone-400 text-[12px]">
                                        暂无详情
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>

            {letterIndex.length > 3 && (
              <div className="hidden md:flex flex-col items-center gap-0.5 py-2 border-t border-stone-200/60 bg-stone-50/40">
                <div className="flex flex-wrap justify-center gap-0.5 px-2">
                  {letterIndex.map(letter => (
                    <button
                      key={letter}
                      onClick={() => scrollToLetter(letter)}
                      className="w-6 h-6 flex items-center justify-center text-[10px] font-semibold text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default DictionaryStep
