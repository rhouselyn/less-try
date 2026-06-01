import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, BookOpen, Volume2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../utils/api'
import { speakText } from '../utils/speech'
import { groupVocab } from '../utils/vocab'
import WordDetail from './WordDetail'

function VocabListStep({ vocab, onClose, loading, t, currentFileId, sourceLang, pageSize = 50 }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedWord, setExpandedWord] = useState(null)
  const [enrichedWords, setEnrichedWords] = useState({})
  const [loadingWord, setLoadingWord] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const listRef = useRef(null)
  const wordRefs = useRef({})

  const scrollToWord = useCallback((wordKey) => {
    requestAnimationFrame(() => {
      const el = wordRefs.current[wordKey]
      if (el && listRef.current) {
        const container = listRef.current
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const scrollOffset = elRect.top - containerRect.top + container.scrollTop - 12
        container.scrollTo({ top: Math.max(0, scrollOffset), behavior: 'instant' })
      }
    })
  }, [])

  const handleWordClick = useCallback(async (word) => {
    const wordKey = word.word
    if (expandedWord === wordKey) {
      setExpandedWord(null)
      return
    }
    scrollToWord(wordKey)
    setExpandedWord(wordKey)

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
      (w.meaning && w.meaning.toLowerCase().includes(q)) ||
      (w.context_meaning && w.context_meaning.toLowerCase().includes(q)) ||
      (w.enriched_meaning && w.enriched_meaning.toLowerCase().includes(q))
    )
  }, [vocab, searchQuery])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredVocab.length / pageSize)), [filteredVocab, pageSize])

  const pagedVocab = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredVocab.slice(start, start + pageSize)
  }, [filteredVocab, currentPage, pageSize])

  const groupedVocab = useMemo(() => groupVocab(pagedVocab), [pagedVocab])

  const letterIndex = useMemo(() => groupedVocab.map(([letter]) => letter), [groupedVocab])

  const allLetterIndex = useMemo(() => groupVocab(filteredVocab).map(([letter]) => letter), [filteredVocab])

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
      const scrollOffset = elRect.top - containerRect.top + container.scrollTop - 12
      container.scrollTo({ top: scrollOffset, behavior: 'smooth' })
    } else {
      const letterLower = letter.toLowerCase()
      const wordIdx = filteredVocab.findIndex(w => w.word.charAt(0).toUpperCase() === letter || w.word.charAt(0).toLowerCase() === letterLower)
      if (wordIdx >= 0) {
        const targetPage = Math.floor(wordIdx / pageSize) + 1
        if (targetPage !== currentPage) setCurrentPage(targetPage)
      }
    }
  }

  const getEnriched = (word) => enrichedWords[word] || {}

  const renderPagination = () => {
    if (totalPages <= 1) return null
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => {
      if (totalPages <= 7) return true
      if (p === 1 || p === totalPages) return true
      if (Math.abs(p - currentPage) <= 1) return true
      return false
    }).reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

    return (
      <div className="flex items-center justify-center gap-0.5 py-2.5 border-t border-stone-100 bg-white/80 backdrop-blur-sm shrink-0">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className={`p-1.5 rounded-lg transition-all ${currentPage <= 1 ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="text-[10px] text-stone-300 px-0.5 select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`min-w-[28px] h-7 flex items-center justify-center text-xs rounded-lg transition-all ${
                currentPage === p
                  ? 'bg-stone-800 text-white font-medium shadow-sm'
                  : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          className={`p-1.5 rounded-lg transition-all ${currentPage >= totalPages ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(28, 25, 23, 0.35)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-white rounded-2xl shadow-[0_24px_80px_-12px_rgba(28,25,23,0.25)] w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden ring-1 ring-stone-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-800 tracking-tight leading-none">{t.vocabList || '单词表'}</h2>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {vocab.length} {t.words || '个单词'}
                {searchQuery && filteredVocab.length !== vocab.length && (
                  <span className="text-stone-500"> · {t.matched || '匹配'} {filteredVocab.length}</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-xl transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-stone-50 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder={t.searchWordOrMeaning || '搜索单词或释义...'}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50/80 border-0 rounded-xl text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
              <p className="text-stone-400 text-sm">{t.loading}</p>
            </div>
          ) : filteredVocab.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <p className="text-stone-400 text-sm">
                {searchQuery ? (t.noMatchFound || '没有找到匹配的单词') : (t.noWordsYet || '暂无单词')}
              </p>
            </div>
          ) : (
            <>
              {/* Letter Index */}
              {allLetterIndex.length > 1 && (
                <div className="hidden sm:flex flex-col items-center gap-0.5 py-3 border-r border-stone-50 bg-stone-50/30 w-8 shrink-0 overflow-y-auto">
                  {allLetterIndex.map(letter => {
                    const onCurrentPage = letterIndex.includes(letter)
                    return (
                      <button
                        key={letter}
                        onClick={() => scrollToLetter(letter)}
                        className={`w-6 h-6 flex items-center justify-center text-[10px] font-medium rounded-md transition-all shrink-0 ${
                          onCurrentPage
                            ? 'text-stone-700 hover:bg-stone-200/60'
                            : 'text-stone-300 hover:text-stone-500 hover:bg-stone-100/60'
                        }`}
                      >
                        {letter}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Word List */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth" ref={listRef}>
                  {groupedVocab.map(([letter, words], groupIdx) => (
                    <div key={letter} id={`vocab-group-${letter}`}>
                      <div className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur-sm px-5 py-1.5 border-b border-stone-100/60">
                        <span className="text-[10px] font-bold text-stone-400 tracking-[0.15em] uppercase">{letter}</span>
                      </div>
                      <div>
                        {words.map((word, index) => {
                          const isExpanded = expandedWord === word.word
                          const enriched = getEnriched(word.word)
                          const displayMeaning = word.enriched_meaning || word.meaning || word.context_meaning
                          return (
                            <div
                              key={word.word}
                              ref={el => { wordRefs.current[word.word] = el }}
                              className={`border-b border-stone-50 ${isExpanded ? 'bg-stone-50/40' : 'bg-white hover:bg-stone-50/30'}`}
                            >
                              <button
                                onClick={() => handleWordClick(word)}
                                className="w-full text-left px-5 py-3 flex items-center gap-3 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[13px] font-semibold text-stone-800 tracking-tight">
                                      {word.word}
                                    </span>
                                    {(enriched.ipa || word.ipa) && (
                                      <span className="text-[11px] text-stone-400 ipa-font">
                                        {(enriched.ipa || word.ipa).startsWith('/') ? (enriched.ipa || word.ipa) : `/${enriched.ipa || word.ipa}/`}
                                      </span>
                                    )}
                                    {(enriched.morphology || word.morphology) && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded font-medium">
                                        {enriched.morphology || word.morphology}
                                      </span>
                                    )}
                                  </div>
                                  {displayMeaning && (
                                    <p className="text-[12px] text-stone-500 mt-0.5 truncate">{displayMeaning}</p>
                                  )}
                                </div>
                                <Volume2
                                  className="w-4 h-4 text-stone-300 hover:text-stone-600 shrink-0 transition-colors"
                                  onClick={(e) => speakWord(word.word, e)}
                                />
                              </button>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-5 pb-4">
                                      {loadingWord === word.word ? (
                                        <div className="py-6 flex flex-col items-center gap-2">
                                          <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                                          <p className="text-[11px] text-stone-400">{t.loadingWordDetails || '正在加载单词详情...'}</p>
                                        </div>
                                      ) : (() => {
                                        const mergedWord = { ...word, ...enriched }
                                        const hasDetail = mergedWord.enriched_meaning || mergedWord.meaning || mergedWord.variants_detail || mergedWord.examples || mergedWord.memory_hint || mergedWord.context_sentences
                                        return hasDetail ? (
                                          <WordDetail word={mergedWord} t={t} sourceLang={sourceLang} hideDefinition disableContextSentenceClick />
                                        ) : (
                                          <div className="py-4 text-center text-stone-400 text-[12px]">{t.noDetails || '暂无详情'}</div>
                                        )
                                      })()}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {renderPagination()}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default VocabListStep
