import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ChevronDown, ChevronLeft, ChevronRight, Volume2, BookOpen, BookText, Lightbulb, GitBranch, Loader2, ArrowLeft, RefreshCw, Brain } from 'lucide-react'
import { api } from '../utils/api'
import { speakText } from '../utils/speech'
import { groupVocab } from '../utils/vocab'

function WordDetailCard({ word, sourceLang, detailLoading, t }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="px-5 pb-4 pt-3 border-t border-stone-900/10">
        {detailLoading ? (
          <div className="pt-4 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
            <p className="font-mono-ui text-[10px] tracking-[0.2em] text-stone-400 uppercase">
              {t.generatingDetail || 'Generating…'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-px bg-stone-900/40" />
                <h3 className="font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase">
                  {t.definition || 'Definition'}
                </h3>
              </div>
              <p className="font-display text-[15px] text-stone-800 leading-relaxed">
                {word.enriched_meaning || word.meaning}
              </p>
            </div>

            {word.variants_detail && word.variants_detail.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-px bg-stone-900/40" />
                  <h3 className="font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase">
                    {t.variants || 'Variants'}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {word.variants_detail.map((variant, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 border border-stone-900/20 text-stone-700 text-[10px] font-mono-ui tracking-wider uppercase">
                        {variant.type}
                      </span>
                      <span className="font-display text-stone-700 text-[14px] italic">{variant.form}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {word.examples && word.examples.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-px bg-stone-900/40" />
                  <h3 className="font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase">
                    {t.examples || 'Examples'}
                  </h3>
                </div>
                <div className="space-y-1.5">
                  {word.examples.slice(0, 3).map((ex, i) => (
                    <div key={i} className="border-l border-stone-900/30 pl-3">
                      <div className="flex items-start gap-1.5">
                        <p className="font-display text-stone-800 text-[14px] leading-snug flex-1">{ex.sentence}</p>
                        {ex.sentence && (
                          <button
                            onClick={(e) => { e.stopPropagation(); speakText(ex.sentence, sourceLang) }}
                            className="p-0.5 text-stone-400 hover:text-stone-900 transition-colors shrink-0"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {ex.translation && (
                        <p className="font-display italic text-stone-500 text-[12px] leading-snug mt-0.5">{ex.translation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {word.memory_hint && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-px bg-stone-900/40" />
                  <h3 className="font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase">
                    {t.memoryHint || 'Mnemonic'}
                  </h3>
                </div>
                <p className="font-display italic text-[14px] text-stone-700 leading-relaxed border-l-2 border-stone-900/30 pl-3">
                  {word.memory_hint}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function WordListPanel({ sourceLang, t, onBack, pageSize = 50 }) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedWord, setExpandedWord] = useState(null)
  const [wordDetails, setWordDetails] = useState({})
  const [detailLoading, setDetailLoading] = useState({})
  const [meaningOverrides, setMeaningOverrides] = useState({})
  const [isOpen, setIsOpen] = useState(false)
  const [displayMode, setDisplayMode] = useState(0)
  const [page, setPage] = useState(1)

  const listRef = useRef(null)
  const wordRefs = useRef({})

  const loadWords = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getWordList(sourceLang)
      setWords(data.words || [])
    } catch (err) {
      console.error('Failed to load word list:', err)
    } finally {
      setLoading(false)
    }
  }, [sourceLang])

  const handleRegenerateWord = useCallback(async (wordKey) => {
    setWordDetails(prev => {
      const next = { ...prev }
      delete next[wordKey]
      return next
    })
    setDetailLoading(prev => ({ ...prev, [wordKey]: true }))
    try {
      const data = await api.regenerateWordDetail(wordKey, sourceLang)
      if (data) {
        setWordDetails(prev => ({ ...prev, [wordKey]: data }))
        setWords(prev => prev.map(w =>
          w.word === wordKey
            ? { ...w, ...data }
            : w
        ))
        const newMeaning = data.enriched_meaning || data.meaning || data.context_meaning
        if (newMeaning) {
          setMeaningOverrides(prev => ({ ...prev, [wordKey]: newMeaning }))
        }
      }
    } catch (e) {
      console.error('Failed to regenerate word:', e)
    } finally {
      setDetailLoading(prev => ({ ...prev, [wordKey]: false }))
    }
  }, [sourceLang])

  const scrollToWord = useCallback((wordKey, delay = 200) => {
    const doScroll = () => {
      let el = wordRefs.current[wordKey]
      if (el && listRef.current) {
        const container = listRef.current
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const stickyOffset = 32
        const scrollOffset = elRect.top - containerRect.top + container.scrollTop - stickyOffset
        container.scrollTo({ top: Math.max(0, scrollOffset), behavior: 'instant' })
      }
    }
    if (delay <= 0) {
      requestAnimationFrame(doScroll)
    } else {
      setTimeout(() => requestAnimationFrame(doScroll), delay)
    }
  }, [])

  useEffect(() => {
    if (onBack) {
      loadWords()
    }
  }, [onBack, loadWords])

  useEffect(() => {
    if (isOpen && !onBack) {
      loadWords()
    }
  }, [isOpen, loadWords, onBack])

  const filteredWords = searchQuery.trim()
    ? words.filter(w =>
        w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.meaning && w.meaning.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : words

  const totalPages = Math.ceil(filteredWords.length / pageSize)

  const pagedWords = filteredWords.slice((page - 1) * pageSize, page * pageSize)

  const groupedWords = useMemo(() => {
    return groupVocab(pagedWords)
  }, [pagedWords])

  const letterIndex = useMemo(() => {
    return groupedWords.map(([letter]) => letter)
  }, [groupedWords])

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const handleWordClick = async (wordText) => {
    if (expandedWord === wordText) {
      setExpandedWord(null)
      return
    }
    speakText(wordText, sourceLang)
    scrollToWord(wordText, 0)
    setTimeout(async () => {
      setExpandedWord(wordText)

      const existing = words.find(w => w.word === wordText)
      const hasDetail = existing && (existing.examples?.length > 0 || existing.memory_hint || existing.variants_detail?.length > 0)

      if (hasDetail) {
        setWordDetails(prev => ({ ...prev, [wordText]: existing }))
        return
      }

      if (!wordDetails[wordText] && !detailLoading[wordText]) {
        setDetailLoading(prev => ({ ...prev, [wordText]: true }))
        try {
          const detail = await api.getWordDetail(wordText, sourceLang)
          setWordDetails(prev => ({ ...prev, [wordText]: detail }))
          setWords(prev => prev.map(w =>
            w.word === wordText
              ? { ...w, variants_detail: detail.variants_detail || w.variants_detail, examples: detail.examples || w.examples, memory_hint: detail.memory_hint || w.memory_hint }
              : w
          ))
        } catch (err) {
          console.error('Failed to load word detail:', err)
        } finally {
          setDetailLoading(prev => ({ ...prev, [wordText]: false }))
        }
      }
    }, 50)
  }

  const scrollToLetter = (letter) => {
    const el = document.getElementById(`letter-${letter}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-center gap-3 py-3 border-t border-stone-900/10">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
          className={`p-1 transition-colors ${page <= 1 ? 'text-stone-200 cursor-not-allowed' : 'text-stone-500 hover:text-stone-900'}`}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 tabular-nums">
          {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
        </span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
          className={`p-1 transition-colors ${page >= totalPages ? 'text-stone-200 cursor-not-allowed' : 'text-stone-500 hover:text-stone-900'}`}>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  const renderWordList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          <span className="font-mono-ui text-[10px] tracking-[0.2em] text-stone-400 uppercase">
            {t.loadingVocab || 'Loading…'}
          </span>
        </div>
      )
    }

    if (filteredWords.length === 0) {
      return (
        <div className="py-16 text-center">
          <BookOpen className="w-6 h-6 text-stone-300 mx-auto mb-3" />
          <p className="font-display italic text-[15px] text-stone-500">
            {searchQuery ? (t.noMatchFound || 'No matches') : (t.noWordsYetHint || 'No words yet')}
          </p>
          <div className="mt-3 mx-auto w-8 h-px bg-stone-900/15" />
        </div>
      )
    }

    return (
      <div className="flex h-full">
        {letterIndex.length > 1 && !searchQuery && (
          <div className="flex flex-col items-center py-2 px-1 border-r border-stone-900/10 shrink-0">
            {letterIndex.map(letter => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className="font-mono-ui text-[9px] tracking-wider text-stone-500 hover:text-stone-900 transition-colors leading-tight px-1 py-px"
              >
                {letter}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin" ref={listRef}>
          {groupedWords.map(([letter, groupWords]) => (
            <div key={letter} id={`letter-${letter}`}>
              <div className="sticky top-0 z-10 px-5 py-1.5 bg-[#faf6ed]/95 backdrop-blur-sm border-b border-stone-900/10 flex items-center gap-2">
                <span className="font-display text-[13px] text-stone-700 tracking-wider">{letter}</span>
                <span className="font-mono-ui text-[10px] text-stone-400 tabular-nums">{String(groupWords.length).padStart(2, '0')}</span>
                <span className="flex-1 h-px bg-stone-900/10" />
              </div>
              {groupWords.map((word) => (
                <div key={word.word} ref={el => { wordRefs.current[word.word] = el }} className="border-b border-stone-900/8 last:border-b-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleWordClick(word.word)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleWordClick(word.word) }}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-stone-900/[0.03] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`font-display text-[17px] text-stone-900 ${displayMode === 2 && expandedWord !== word.word ? 'invisible' : ''}`}>{word.word}</span>
                        {word.ipa && (
                          <span className={`font-mono-ui text-[10px] text-stone-400 ${displayMode === 2 && expandedWord !== word.word ? 'invisible' : ''}`}>
                            {word.ipa.startsWith('/') ? word.ipa : `/${word.ipa}/`}
                          </span>
                        )}
                        {word.part_of_speech && (
                          <span className="font-mono-ui text-[9px] px-1 py-px border border-stone-900/20 text-stone-500 tracking-wider uppercase">
                            {word.part_of_speech}
                          </span>
                        )}
                      </div>
                      {word.meaning && (
                        <p className={`font-display italic text-[13px] text-stone-500 mt-0.5 truncate ${displayMode === 1 && expandedWord !== word.word ? 'invisible' : ''}`}>{meaningOverrides[word.word] || word.meaning}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {expandedWord === word.word && detailLoading[word.word] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />
                      ) : expandedWord === word.word ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRegenerateWord(word.word) }}
                          className="p-1 text-stone-400 hover:text-stone-900 transition-colors"
                          title={t.regenerate || 'Regenerate'}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                      <button
                        onClick={(e) => { e.stopPropagation(); speakText(word.word, sourceLang) }}
                        className="p-1 text-stone-400 hover:text-stone-900 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedWord === word.word && (
                      <WordDetailCard
                        word={wordDetails[word.word] || word}
                        sourceLang={sourceLang}
                        detailLoading={detailLoading[word.word]}
                        t={t}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ))}
          {renderPagination()}
        </div>
      </div>
    )
  }

  if (onBack) {
    return (
      <div className="h-full flex flex-col bg-[#faf6ed] border border-stone-900/15 overflow-hidden min-h-0" style={{ borderRadius: 0 }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-900/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono-ui text-[10px] tracking-[0.25em] text-stone-500 uppercase">
              {t.vocabOverview || 'Vocabulary'}
            </span>
            <span className="w-px h-3 bg-stone-900/15" />
            {!loading && words.length > 0 && (
              <span className="font-mono-ui text-[10px] tracking-wider text-stone-500 tabular-nums">
                {String(words.length).padStart(3, '0')} {t.wordCount || 'words'}
              </span>
            )}
            <button
              onClick={() => setDisplayMode(v => (v + 1) % 3)}
              className="p-1 text-stone-400 hover:text-stone-900 transition-colors"
              title={displayMode === 0 ? '显示全部' : displayMode === 1 ? '隐藏释义' : '隐藏单词'}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 font-mono-ui text-[10px] tracking-[0.2em] uppercase text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            {t.back || 'Back'}
          </button>
        </div>

        <div className="px-4 py-3 border-b border-stone-900/10 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchWordOrMeaning || 'Search words…'}
              className="w-full pl-9 pr-9 py-2 text-[13px] bg-transparent border border-stone-900/20 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 font-display transition-colors"
              style={{ borderRadius: 0 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {renderWordList()}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ y: 0 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-[#faf6ed] border border-stone-900/20 hover:border-stone-900 transition-all"
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-3.5 h-3.5 text-stone-700" />
          <span className="font-mono-ui text-[10px] tracking-[0.25em] text-stone-700 uppercase">
            {t.vocabOverview || 'Vocabulary'}
          </span>
          {!isOpen && words.length > 0 && (
            <span className="font-mono-ui text-[10px] tracking-wider text-stone-500 tabular-nums">
              {String(words.length).padStart(3, '0')}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 bg-[#faf6ed] border border-stone-900/20" style={{ borderRadius: 0 }}>
              <div className="p-4 border-b border-stone-900/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchWordOrMeaning || 'Search words…'}
                    className="w-full pl-9 pr-9 py-2 text-[13px] bg-transparent border border-stone-900/20 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 font-display transition-colors"
                    style={{ borderRadius: 0 }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-900 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono-ui text-[10px] tracking-[0.2em] text-stone-400 uppercase">
                    {loading ? (t.loading || 'Loading…') : `${String(filteredWords.length).padStart(3, '0')} ${t.wordCount || 'words'}`}
                  </span>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
                {renderWordList()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default WordListPanel
