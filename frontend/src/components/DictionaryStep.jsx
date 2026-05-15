import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Shuffle, Loader2, Languages, BookOpen, ArrowUpDown } from 'lucide-react'
import WordDetail from './WordDetail'
import SentenceDetail from './SentenceDetail'

function DictionaryStep({ vocab, onToggleSort, sortOrder, progress, processingInfo, sentenceTranslations, selectedSentence, selectedWord, onSentenceClick, onCloseSentenceDetail, onWordClick, onStartLearning, loading, t, currentFileId }) {
  const [expandedWord, setExpandedWord] = useState(null)
  const [wordDetailCache, setWordDetailCache] = useState({})
  const [loadingWords, setLoadingWords] = useState({})
  const [wordDetails, setWordDetails] = useState({})
  const vocabListRef = useRef(null)
  const wordRefs = useRef({})

  const safeSentenceTranslations = Array.isArray(sentenceTranslations) ? sentenceTranslations : []
  const safeProcessingInfo = processingInfo || { current: 0, total: 1 }

  const fetchWordDetail = useCallback(async (wordKey) => {
    if (wordDetails[wordKey]) return wordDetails[wordKey]
    if (wordDetailCache[wordKey]) {
      setWordDetails(prev => ({ ...prev, [wordKey]: wordDetailCache[wordKey] }))
      return wordDetailCache[wordKey]
    }

    setLoadingWords(prev => ({ ...prev, [wordKey]: true }))
    try {
      const response = await fetch(`/api/word/${currentFileId}/${wordKey}`)
      const data = await response.json()
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

  const scrollToWord = useCallback((wordKey) => {
    setTimeout(() => {
      const el = wordRefs.current[wordKey]
      if (el && vocabListRef.current) {
        const container = vocabListRef.current
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const scrollOffset = elRect.top - containerRect.top + container.scrollTop - containerRect.height / 3
        container.scrollTo({ top: scrollOffset, behavior: 'smooth' })
      }
    }, 100)
  }, [])

  const handleTokenClick = useCallback(async (sourceWord) => {
    const sourceLower = sourceWord.toLowerCase()
    const matchedWord = vocab.find(w => {
      if (w.word.toLowerCase() === sourceLower) return true
      if (w.tokens && w.tokens.some(t => t.toLowerCase() === sourceLower)) return true
      return false
    })

    if (!matchedWord) return

    const wordKey = matchedWord.word
    setExpandedWord(wordKey)
    scrollToWord(wordKey)
    fetchWordDetail(wordKey)
  }, [vocab, scrollToWord, fetchWordDetail])

  const handleVocabWordClick = useCallback(async (word) => {
    const wordKey = word.word
    if (expandedWord === wordKey) {
      setExpandedWord(null)
      return
    }
    setExpandedWord(wordKey)
    fetchWordDetail(wordKey)
  }, [expandedWord, fetchWordDetail])

  const findVocabWordBySourceText = useCallback((sourceText) => {
    const sourceLower = sourceText.toLowerCase()
    return vocab.some(w => {
      if (w.word.toLowerCase() === sourceLower) return true
      if (w.tokens && w.tokens.some(t => t.toLowerCase() === sourceLower)) return true
      return false
    })
  }, [vocab])

  const renderOriginalSentence = (item) => {
    const sentence = item.sentence || ''
    const tr = item.translation_result
    const tokens = (tr && tr.translation && Array.isArray(tr.translation)) ? tr.translation : null

    if (!tokens) {
      return <div className="font-medium text-stone-800 mb-1.5">{sentence}</div>
    }

    const vocabWords = tokens
      .filter(t => typeof t === 'object' && t.text)
      .map(t => t.text)

    if (vocabWords.length === 0) {
      return <div className="font-medium text-stone-800 mb-1.5">{sentence}</div>
    }

    const escapedWords = vocabWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
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
    return <div className="text-stone-600 text-sm">{text}</div>
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

      {!processingInfo && vocab.length > 0 && (
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
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-stone-200/80 bg-stone-50/60">
              <Languages className="w-4 h-4 text-stone-500" />
              <h3 className="text-sm font-semibold text-stone-700">{t.sentTranslation}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {safeSentenceTranslations.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {safeSentenceTranslations.length > 0 ? (
                <div className="divide-y divide-stone-200/60">
                  {safeSentenceTranslations.map((item, index) => (
                    <div key={index}>
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`p-4 cursor-pointer transition-colors ${
                          selectedSentence === index ? 'bg-amber-50/60' : 'hover:bg-amber-50/30'
                        }`}
                        onClick={() => onSentenceClick(index)}
                      >
                        {renderOriginalSentence(item)}
                        {renderTranslation(item)}
                      </motion.div>
                      {selectedSentence === index && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="border-t border-stone-200/60 p-4 bg-stone-50/50"
                        >
                          <SentenceDetail
                            sentenceTranslation={safeSentenceTranslations[index]}
                            t={t}
                          />
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <Languages className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                  <p className="text-stone-400 text-sm">{t.loading}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200/80 bg-stone-50/60">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-stone-500" />
                <h3 className="text-sm font-semibold text-stone-700">{t.vocabList}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {vocab.length}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleSort}
                className="flex items-center gap-1 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-amber-50 rounded-md transition-colors text-xs font-medium"
              >
                <ArrowUpDown className="w-3 h-3" />
                {sortOrder === 'asc' ? t.aToZ : t.zToA}
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto" ref={vocabListRef} style={{ maxHeight: '70vh' }}>
              <div className="divide-y divide-stone-200/60">
                {vocab.map((word, index) => {
                  const wordKey = word.word
                  const isExpanded = expandedWord === wordKey
                  const isLoading = loadingWords[wordKey]
                  const detail = wordDetails[wordKey]

                  return (
                    <div key={wordKey || index} ref={el => { wordRefs.current[wordKey] = el }}>
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.01 }}
                        className={`p-4 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-amber-50/50' : 'hover:bg-amber-50/30'
                        }`}
                        onClick={() => handleVocabWordClick(word)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="font-medium text-stone-800">{word.word}</span>
                              {word.ipa && (
                                <span className="text-stone-400 text-sm ml-2 ipa-font">/{word.ipa}/</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-stone-600 text-sm">{word.context_meaning}</span>
                            {word.morphology && (
                              <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded font-mono">
                                {word.morphology}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="border-t border-stone-200/60 bg-stone-50/30"
                        >
                          {isLoading ? (
                            <div className="p-8 flex flex-col items-center justify-center gap-3">
                              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                              <p className="text-sm text-stone-400">正在生成单词详解...</p>
                            </div>
                          ) : detail ? (
                            <div className="p-4">
                              <WordDetail word={detail} t={t} />
                            </div>
                          ) : (
                            <div className="p-4 text-center text-stone-400 text-sm">
                              暂无详情
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default DictionaryStep
