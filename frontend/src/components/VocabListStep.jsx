import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, BookOpen, Volume2, Loader2 } from 'lucide-react'
import { api } from '../utils/api'
import { speakText } from '../utils/speech'
import { groupVocab } from '../utils/vocab'
import WordDetail from './WordDetail'

function VocabListStep({ vocab, onBack, loading, t, currentFileId, sourceLang }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedWord, setExpandedWord] = useState(null)
  const [enrichedWords, setEnrichedWords] = useState({})
  const [loadingWord, setLoadingWord] = useState(null)
  const listRef = useRef(null)
  const wordRefs = useRef({})

  const scrollToWord = useCallback((wordKey, delay = 100) => {
    setTimeout(() => {
      const el = wordRefs.current[wordKey]
      if (el && listRef.current) {
        const container = listRef.current
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const stickyOffset = 32
        const scrollOffset = elRect.top - containerRect.top + container.scrollTop - stickyOffset
        container.scrollTo({ top: scrollOffset, behavior: 'smooth' })
      }
    }, delay)
  }, [])

  const handleWordClick = useCallback(async (word) => {
    const wordKey = word.word
    if (expandedWord === wordKey) {
      setExpandedWord(null)
      return
    }
    setExpandedWord(wordKey)
    scrollToWord(wordKey, 100)
    scrollToWord(wordKey, 300)

    if (currentFileId && !enrichedWords[wordKey]) {
      setLoadingWord(wordKey)
      try {
        const details = await api.getWordDetails(currentFileId, wordKey)
        setEnrichedWords(prev => ({ ...prev, [wordKey]: details }))
      } catch (e) {
        console.error('Failed to fetch word details:', e)
      } finally {
        setLoadingWord(null)
      }
    }
  }, [expandedWord, scrollToWord, currentFileId, enrichedWords])

  const filteredVocab = useMemo(() => {
    if (!searchQuery.trim()) return vocab
    const q = searchQuery.toLowerCase()
    return vocab.filter(w =>
      w.word.toLowerCase().includes(q) ||
      (w.context_meaning && w.context_meaning.toLowerCase().includes(q)) ||
      (w.enriched_meaning && w.enriched_meaning.toLowerCase().includes(q)) ||
      (w.translation && w.translation.toLowerCase().includes(q))
    )
  }, [vocab, searchQuery])

  const groupedVocab = useMemo(() => {
    return groupVocab(filteredVocab)
  }, [filteredVocab])

  const letterIndex = useMemo(() => {
    return groupedVocab.map(([letter]) => letter)
  }, [groupedVocab])

  const speakWord = useCallback((text, e) => {
    if (e) e.stopPropagation()
    speakText(text, sourceLang)
  }, [sourceLang])

  const scrollToLetter = (letter) => {
    const el = document.getElementById(`vocab-group-${letter}`)
    if (el && listRef.current) {
      const container = listRef.current
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const stickyOffset = 32
      const scrollOffset = elRect.top - containerRect.top + container.scrollTop - stickyOffset
      container.scrollTo({ top: scrollOffset, behavior: 'smooth' })
    }
  }

  const getEnriched = (word) => enrichedWords[word] || {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto"
    >
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-stone-500 hover:text-stone-800 transition-colors rounded-lg hover:bg-stone-100 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-stone-800 tracking-tight">单词表</h2>
            <p className="text-sm text-stone-400 mt-1">
              共 <span className="text-amber-600 font-semibold">{vocab.length}</span> 个单词
              {searchQuery && filteredVocab.length !== vocab.length && (
                <span> · 匹配 <span className="text-amber-600 font-semibold">{filteredVocab.length}</span> 个</span>
              )}
            </p>
          </div>
          <BookOpen className="w-5 h-5 text-stone-300" />
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索单词或释义..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-200/60 focus:border-amber-300/60 transition-all"
          />
        </div>
      </motion.div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-400 text-sm">{t.loading}</p>
        </div>
      ) : filteredVocab.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-stone-400 text-sm">
            {searchQuery ? '没有找到匹配的单词' : '暂无单词'}
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          {letterIndex.length > 1 && (
            <div className="hidden sm:flex flex-col items-center gap-0.5 pt-8 sticky top-8 self-start shrink-0">
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
          )}
          <div className="flex-1 min-w-0">
            <div className="space-y-3" ref={listRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {groupedVocab.map(([letter, words], groupIdx) => (
                <div key={letter} id={`vocab-group-${letter}`}>
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
                      const isExpanded = expandedWord === word.word
                      const enriched = getEnriched(word.word)
                      const displayMeaning = word.enriched_meaning || word.context_meaning || word.translation
                      return (
                        <motion.div
                          key={word.word}
                          ref={el => { wordRefs.current[word.word] = el }}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: groupIdx * 0.03 + index * 0.015 }}
                          className="bg-white"
                        >
                          <button
                            onClick={() => handleWordClick(word)}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-amber-50/40 transition-colors group"
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                              <span className="text-[14px] font-semibold text-stone-800 tracking-tight shrink-0">
                                {word.word}
                              </span>
                              {(enriched.ipa || word.ipa) && (
                                <span className="text-[11px] text-stone-400 ipa-font shrink-0">
                                  {(enriched.ipa || word.ipa).startsWith('/') ? (enriched.ipa || word.ipa) : `/${enriched.ipa || word.ipa}/`}
                                </span>
                              )}
                              {(enriched.morphology || word.morphology) && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded font-medium tracking-wide shrink-0">
                                  {enriched.morphology || word.morphology}
                                </span>
                              )}
                              <span className="text-[12px] text-stone-500">
                                {displayMeaning}
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
                                  {loadingWord === word.word ? (
                                    <div className="pt-4 flex flex-col items-center justify-center gap-3">
                                      <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                                      <p className="text-[12px] text-stone-400">正在加载单词详情...</p>
                                    </div>
                                  ) : (() => {
                                    const mergedWord = { ...word, ...enriched }
                                    const hasDetail = mergedWord.enriched_meaning || mergedWord.meaning || mergedWord.variants_detail || mergedWord.examples || mergedWord.memory_hint || mergedWord.context_sentences
                                    return hasDetail ? (
                                      <WordDetail word={mergedWord} t={t} sourceLang={sourceLang} />
                                    ) : (
                                      <div className="pt-3 text-center text-stone-400 text-[12px]">暂无详情</div>
                                    )
                                  })()}
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
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default VocabListStep
