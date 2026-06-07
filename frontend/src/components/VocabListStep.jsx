import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, BookOpen, Volume2, Loader2, Brain, ChevronLeft, ChevronRight } from 'lucide-react'
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

  // 切换页数时滚动条置顶
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [currentPage])

  const scrollToWord = useCallback((wordKey) => {
    requestAnimationFrame(() => {
      const el = wordRefs.current[wordKey]
      if (el && listRef.current) {
        const container = listRef.current
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const scrollOffset = elRect.top - containerRect.top + container.scrollTop - 32
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
    speakText(word.word, sourceLang)
    scrollToWord(wordKey)
    setTimeout(() => setExpandedWord(wordKey), 50)

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

  // 完全照搬 DictionaryStep 的分组逻辑
  const groupedVocab = useMemo(() => {
    return groupVocab(pagedVocab)
  }, [pagedVocab])

  const letterIndex = useMemo(() => {
    return groupedVocab.map(([letter]) => letter)
  }, [groupedVocab])

  const allLetterIndex = useMemo(() => {
    return groupVocab(filteredVocab).map(([letter]) => letter)
  }, [filteredVocab])

  const speakWord = useCallback((text, e) => {
    if (e) e.stopPropagation()
    speakText(text, sourceLang)
  }, [sourceLang])

  const pendingLetterRef = useRef(null)

  const scrollToLetter = useCallback((letter) => {
    const el = document.getElementById(`vocab-group-${letter}`)
    if (el && listRef.current) {
      const container = listRef.current
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const scrollOffset = elRect.top - containerRect.top + container.scrollTop - 32
      container.scrollTo({ top: Math.max(0, scrollOffset), behavior: 'smooth' })
    } else {
      const letterLower = letter.toLowerCase()
      const wordIdx = filteredVocab.findIndex(w => {
        const key = (w.word || '')[0]?.normalize('NFD')[0]?.toUpperCase() || '#'
        return key === letter || key.toLowerCase() === letterLower
      })
      if (wordIdx >= 0) {
        const targetPage = Math.floor(wordIdx / pageSize) + 1
        if (targetPage !== currentPage) {
          pendingLetterRef.current = letter
          setCurrentPage(targetPage)
        }
      }
    }
  }, [filteredVocab, currentPage, pageSize])

  useEffect(() => {
    if (pendingLetterRef.current) {
      const letter = pendingLetterRef.current
      pendingLetterRef.current = null
      setTimeout(() => {
        const el = document.getElementById(`vocab-group-${letter}`)
        if (el && listRef.current) {
          const container = listRef.current
          const containerRect = container.getBoundingClientRect()
          const elRect = el.getBoundingClientRect()
          const scrollOffset = elRect.top - containerRect.top + container.scrollTop - 32
          container.scrollTo({ top: Math.max(0, scrollOffset), behavior: 'smooth' })
        }
      }, 200)
    }
  }, [currentPage])

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
      <div className="flex items-center justify-center gap-1 py-2 border-t border-stone-300 bg-gradient-to-r from-cadmium-50 to-canvas-50 shrink-0">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className={`p-1.5 rounded-lg transition-all ${currentPage <= 1 ? 'text-stone-300 cursor-not-allowed' : 'text-umber-600 hover:text-cadmium-700 hover:bg-cadmium-100'}`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="text-[10px] text-stone-400 px-1">…</span>
          ) : (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`min-w-[26px] h-[26px] flex items-center justify-center text-[11px] rounded-lg transition-all font-medium ${
                currentPage === p
                  ? 'bg-gradient-to-r from-cadmium-400 to-cadmium-500 text-white shadow-impasto-sm'
                  : 'text-umber-600 hover:text-cadmium-700 hover:bg-cadmium-100'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          className={`p-1.5 rounded-lg transition-all ${currentPage >= totalPages ? 'text-stone-300 cursor-not-allowed' : 'text-umber-600 hover:text-cadmium-700 hover:bg-cadmium-100'}`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-gradient-to-br from-canvas-50 to-canvas-100 border border-stone-300 rounded-3xl shadow-impasto overflow-hidden flex flex-col max-w-2xl max-h-[85vh] w-full">
        <div className="px-5 py-3.5 border-b border-stone-300 bg-gradient-to-r from-cadmium-100 to-canvas-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cadmium-600" />
              <h2 className="text-sm font-semibold font-display text-umber-800">{t.vocabList || '单词表'}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cadmium-200 text-cadmium-700 font-medium">
                {vocab.length}
              </span>
              {searchQuery && filteredVocab.length !== vocab.length && (
                <span className="text-xs text-umber-500">· {t.matched || '匹配'} {filteredVocab.length}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-umber-500 hover:text-umber-800 hover:bg-canvas-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-stone-300 bg-canvas-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-umber-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder={t.searchWordOrMeaning || '搜索单词或释义...'}
              className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-[13px] text-umber-800 placeholder:text-umber-400 focus:outline-none focus:ring-2 focus:ring-cadmium-400 focus:border-cadmium-400 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {loading ? (
            <div className="flex-1 py-16 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-cadmium-500" />
              <p className="text-umber-500 text-sm">{t.loading}</p>
            </div>
          ) : filteredVocab.length === 0 ? (
            <div className="flex-1 py-16 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-stone-300" />
              <p className="text-umber-500 text-sm">
                {searchQuery ? (t.noMatchFound || '没有找到匹配的单词') : (t.noWordsYet || '暂无单词')}
              </p>
            </div>
          ) : (
            <>
              {allLetterIndex.length > 1 && !searchQuery && (
                <div className="flex flex-col items-center gap-px py-1 border-r border-stone-300 bg-gradient-to-b from-cadmium-50 to-canvas-50 w-5 shrink-0 overflow-y-auto">
                  {allLetterIndex.map(letter => {
                    const onCurrentPage = letterIndex.includes(letter)
                    return (
                      <button
                        key={letter}
                        onClick={() => scrollToLetter(letter)}
                        className={`w-4 h-4 flex items-center justify-center text-[8px] font-semibold rounded transition-colors shrink-0 ${
                          onCurrentPage
                            ? 'text-cadmium-700 bg-cadmium-200'
                            : 'text-umber-500 hover:text-cadmium-600 hover:bg-cadmium-100'
                        }`}
                      >
                        {letter}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col bg-white">
                <div className="flex-1 overflow-y-scroll min-h-0" ref={listRef} style={{ scrollbarGutter: 'stable' }}>
                  <div>
                    {groupedVocab.map(([letter, words], groupIdx) => (
                      <div key={`group-${groupIdx}-${letter}`} id={`vocab-group-${letter}`}>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: groupIdx * 0.04 }}
                          className="sticky top-0 z-10 backdrop-blur-md bg-gradient-to-r from-cadmium-100/95 to-cadmium-50/95 px-4 py-2 border-b border-stone-300"
                        >
                          <span className="text-xs font-bold text-cadmium-700 tracking-widest">{letter}</span>
                        </motion.div>
                        <div>
                          {words.map((word, wordIdx) => {
                            const isExpanded = expandedWord === word.word
                            const enriched = getEnriched(word.word)
                            const displayMeaning = word.enriched_meaning || word.meaning || word.context_meaning
                            const isEven = wordIdx % 2 === 0
                            return (
                              <motion.div
                                key={`${word.word}-${wordIdx}`}
                                ref={el => { wordRefs.current[word.word] = el }}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`${isEven ? 'bg-white' : 'bg-cadmium-50/60'}`}
                              >
                                <button
                                  onClick={() => handleWordClick(word)}
                                  className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-cadmium-100/60 transition-colors group"
                                >
                                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap select-text">
                                    <span className="text-[14px] font-semibold text-umber-800 tracking-tight shrink-0">
                                      {word.word}
                                    </span>
                                    {(enriched.ipa || word.ipa) && (
                                      <span className="text-[11px] text-umber-500 ipa-font shrink-0">
                                        {(enriched.ipa || word.ipa).startsWith('/') ? (enriched.ipa || word.ipa) : `/${enriched.ipa || word.ipa}/`}
                                      </span>
                                    )}
                                    {(enriched.morphology || word.morphology) && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-cadmium-100 text-cadmium-700 rounded font-medium tracking-wide shrink-0">
                                        {enriched.morphology || word.morphology}
                                      </span>
                                    )}
                                    <span className="text-[12px] text-umber-600 truncate">
                                      {displayMeaning}
                                    </span>
                                  </div>
                                  <Volume2
                                    className="w-3.5 h-3.5 text-umber-400 hover:text-cadmium-600 shrink-0 transition-colors"
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
                                      <div className="px-4 pb-4 border-t border-stone-200 bg-gradient-to-b from-cadmium-50/40 to-white">
                          {loadingWord === word.word ? (
                            <div className="pt-4 flex flex-col items-center justify-center gap-3">
                              <Loader2 className="w-5 h-5 animate-spin text-cadmium-500" />
                              <p className="text-[12px] text-umber-500">{t.loadingWordDetails || '正在加载单词详情...'}</p>
                            </div>
                          ) : (() => {
                            const mergedWord = { ...word, ...enriched }
                            const hasDetail = mergedWord.enriched_meaning || mergedWord.meaning || mergedWord.variants_detail || mergedWord.examples || mergedWord.memory_hint || mergedWord.context_sentences
                            return hasDetail ? (
                              <div className="pt-3">
                                <div className="mb-3">
                                  <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-cadmium-700 uppercase tracking-wider">
                                    <Brain className="w-3 h-3" />
                                    {t.definition || '释义'}
                                  </h3>
                                  <p className="text-[13px] text-umber-700 leading-relaxed bg-white/70 px-3 py-2 rounded-lg border border-cadmium-100">
                                    {mergedWord.enriched_meaning || mergedWord.meaning || mergedWord.context_meaning}
                                  </p>
                                </div>
                                <WordDetail word={mergedWord} t={t} sourceLang={sourceLang} hideDefinition disableContextSentenceClick />
                              </div>
                            ) : (
                              <div className="pt-3 text-center text-umber-500 text-[12px]">{t.noDetails || '暂无详情'}</div>
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
                {renderPagination()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VocabListStep
