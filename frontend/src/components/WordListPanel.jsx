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
      <div className="px-5 pb-4 pt-2 border-t border-cream-100">
        {detailLoading ? (
          <div className="pt-4 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-ochre-500" />
            <p className="text-[12px] text-ink-400">{t.generatingWordDetails || '正在生成单词详解...'}</p>
          </div>
        ) : (
          <>
            <div className="mb-2">
              <h3 className="label-warm text-[10px] font-semibold text-ink-500 uppercase tracking-[0.12em] mb-0.5 flex items-center gap-1">
                <Brain className="w-3 h-3 text-ochre-500" />
                {t.definition || '释义'}
              </h3>
              <p className="text-[13px] text-ink-700 leading-relaxed">
                {word.enriched_meaning || word.meaning}
              </p>
            </div>

            {word.variants_detail && word.variants_detail.length > 0 && (
              <div className="mb-2">
                <h3 className="label-warm text-[10px] font-semibold text-ink-500 uppercase tracking-[0.12em] mb-0.5 flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-ochre-500" />
                  {t.variants || '词形变化'}
                </h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {word.variants_detail.map((variant, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="badge-ochre px-1.5 py-0.5 bg-ochre-50 text-ochre-500 rounded-none text-[11px] font-medium">
                        {variant.type}
                      </span>
                      <span className="text-ink-600 text-[13px]">{variant.form}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {word.examples && word.examples.length > 0 && (
              <div className="mb-2">
                <h3 className="label-warm text-[10px] font-semibold text-ink-500 uppercase tracking-[0.12em] mb-0.5 flex items-center gap-1">
                  <BookText className="w-3 h-3 text-ochre-500" />
                  {t.examples || '例句'}
                </h3>
                <div className="space-y-1">
                  {word.examples.slice(0, 3).map((ex, i) => (
                    <div key={i} className="border-l-2 border-ochre-200 pl-2.5">
                      <div className="flex items-start gap-1.5">
                        <p className="text-ink-700 text-[13px] leading-snug flex-1">{ex.sentence}</p>
                        {ex.sentence && (
                          <button
                            onClick={(e) => { e.stopPropagation(); speakText(ex.sentence, sourceLang) }}
                            className="p-0.5 text-ochre-400 hover:text-ochre-500 hover:bg-ochre-50 rounded-none transition-colors shrink-0"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {ex.translation && (
                        <p className="text-ink-400 text-[11px] leading-snug">{ex.translation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {word.memory_hint && (
              <div className="mb-2">
                <h3 className="label-warm text-[10px] font-semibold text-ink-500 uppercase tracking-[0.12em] mb-0.5 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-ochre-500" />
                  {t.memoryHint || '记忆辅助'}
                </h3>
                <p className="text-[13px] text-ink-600 leading-relaxed bg-ochre-50/70 px-3 py-2 rounded-none border-2 border-ochre-400">
                  {word.memory_hint}
                </p>
              </div>
            )}
          </>
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

  const allLetterIndex = useMemo(() => {
    return groupVocab(filteredWords).map(([letter]) => letter)
  }, [filteredWords])

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

  const pendingLetterRef = useRef(null)

  const scrollToLetter = (letter) => {
    const el = document.getElementById(`letter-${letter}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else {
      // 字母不在当前页，先跳转到对应页面
      const letterLower = letter.toLowerCase()
      const wordIdx = filteredWords.findIndex(w => w.word.charAt(0).toUpperCase() === letter || w.word.charAt(0).toLowerCase() === letterLower)
      if (wordIdx >= 0) {
        const targetPage = Math.floor(wordIdx / pageSize) + 1
        if (targetPage !== page) {
          pendingLetterRef.current = letter
          setPage(targetPage)
        }
      }
    }
  }

  // 页面切换后滚动到目标字母
  useEffect(() => {
    if (pendingLetterRef.current) {
      const letter = pendingLetterRef.current
      pendingLetterRef.current = null
      setTimeout(() => {
        const el = document.getElementById(`letter-${letter}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 200)
    }
  }, [page])

  const renderPagination = () => {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-center gap-1 py-2 border-t border-bone-200/60 bg-cream-50/40">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
          className={`p-1 rounded-none transition-colors ${page <= 1 ? 'text-bone-200 cursor-not-allowed' : 'text-ink-400 hover:text-ink-600 hover:bg-cream-100'}`}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] text-ink-400 px-2">{page} / {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
          className={`p-1 rounded-none transition-colors ${page >= totalPages ? 'text-bone-200 cursor-not-allowed' : 'text-ink-400 hover:text-ink-600 hover:bg-cream-100'}`}>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  const renderWordList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-ochre-400" />
          <span className="ml-2 text-sm text-ink-400">{t.loadingVocab || '加载单词表...'}</span>
        </div>
      )
    }

    if (filteredWords.length === 0) {
      return (
        <div className="py-16 text-center">
          <BookOpen className="w-8 h-8 text-bone-200 mx-auto mb-2" />
          <p className="text-sm text-ink-400">
            {searchQuery ? (t.noMatchFound || '未找到匹配的单词') : (t.noWordsYetHint || '暂无单词，开始学习后将自动收录')}
          </p>
        </div>
      )
    }

    return (
      <div className="flex h-full">
        {allLetterIndex.length > 1 && !searchQuery && (
          <div className="flex flex-col items-center gap-px py-1 border-r border-cream-100 bg-cream-50/50 shrink-0 w-5">
            {allLetterIndex.map(letter => {
              const onCurrentPage = letterIndex.includes(letter)
              return (
                <button
                  key={letter}
                  onClick={() => scrollToLetter(letter)}
                  className={`w-4 h-4 flex items-center justify-center text-[8px] font-semibold rounded-none transition-colors leading-tight ${
                    onCurrentPage
                      ? 'text-ink-600 hover:text-ochre-500 hover:bg-ochre-50'
                      : 'text-bone-300/60 hover:text-ochre-500 hover:bg-ochre-50/50'
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-y-auto" ref={listRef}>
          {groupedWords.map(([letter, groupWords]) => (
            <div key={letter} id={`letter-${letter}`}>
              <div className="sticky top-0 z-10 px-5 py-1.5 bg-cream-50/90 border-b border-cream-100">
                <span className="label-warm text-xs font-bold text-ink-400 tracking-wider">{letter}</span>
                <span className="text-[10px] text-bone-300 ml-1.5">{groupWords.length}</span>
              </div>
              {groupWords.map((word) => (
                <div key={word.word} ref={el => { wordRefs.current[word.word] = el }} className="border-b border-cream-50 last:border-b-0">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleWordClick(word.word)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleWordClick(word.word) }}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-cream-50/80 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold font-serif text-ink-800 ${displayMode === 2 && expandedWord !== word.word ? 'invisible' : ''}`}>{word.word}</span>
                        {word.ipa && (
                          <span className={`text-xs text-ink-400 ipa-font ${displayMode === 2 && expandedWord !== word.word ? 'invisible' : ''}`}>
                            {word.ipa.startsWith('/') ? word.ipa : `/${word.ipa}/`}
                          </span>
                        )}
                        {word.part_of_speech && (
                          <span className="badge-ochre text-[10px] px-1.5 py-0.5 bg-cream-100 text-ink-500 rounded-none font-medium">
                            {word.part_of_speech}
                          </span>
                        )}
                      </div>
                      {word.meaning && (
                        <p className={`text-xs text-ink-500 mt-0.5 truncate ${displayMode === 1 && expandedWord !== word.word ? 'invisible' : ''}`}>{meaningOverrides[word.word] || word.meaning}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {expandedWord === word.word && detailLoading[word.word] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-ochre-400" />
                      ) : expandedWord === word.word ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRegenerateWord(word.word) }}
                          className="p-1.5 text-bone-300 hover:text-ochre-500 hover:bg-ochre-50 rounded-full transition-colors"
                          title={t.regenerate || '重新生成'}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                      <button
                        onClick={(e) => { e.stopPropagation(); speakText(word.word, sourceLang) }}
                        className="p-1.5 text-bone-300 hover:text-ochre-500 hover:bg-ochre-50 rounded-full transition-colors"
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
      <div className="h-full flex flex-col bg-cream-50 rounded-none border-2 border-ochre-400 shadow-warm-sm overflow-hidden min-h-0 font-serif">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-bone-200/60 bg-cream-50">
          <div className="flex items-center gap-2.5">
            <BookOpen className={`w-5 h-5 cursor-pointer transition-colors ${displayMode !== 0 ? 'text-ochre-500' : 'text-ochre-500 hover:text-ochre-500'}`} onClick={() => setDisplayMode(v => (v + 1) % 3)} title={displayMode === 0 ? (t.showAll || '显示全部') : displayMode === 1 ? (t.hideMeaning || '隐藏释义') : (t.hideWord || '隐藏单词')} />
            <span className="text-base font-semibold font-serif text-ink-800">{t.vocabOverview || '词汇总览'}</span>
            {!loading && words.length > 0 && (
              <span className="badge-ochre text-xs text-ink-400 bg-cream-100 px-2 py-0.5 rounded-none">{words.length} {t.wordCount || '词'}</span>
            )}
          </div>
          <button
            onClick={onBack}
            className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back || '返回'}
          </button>
        </div>

        <div className="px-4 py-3 border-b border-cream-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchWordOrMeaning || '搜索单词或释义...'}
              className="input-warm w-full pl-9 pr-9 py-2 text-sm bg-transparent border-2 border-ochre-400 rounded-none font-serif focus:outline-none focus:bg-ochre-400/5 placeholder-ink-400 transition-colors duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-ink-400 hover:text-ink-600 transition-colors"
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
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-cream-50/80 rounded-none border-2 border-ochre-400 hover:border-ochre-200/60 transition-all shadow-warm-sm font-serif"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-ochre-500" />
          <span className="text-sm font-semibold font-serif text-ink-700">{t.vocabOverview || '词汇总览'}</span>
          {!isOpen && words.length > 0 && (
            <span className="badge-ochre text-xs text-ink-400 bg-cream-100 px-2 py-0.5 rounded-none">{words.length} {t.wordCount || '词'}</span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-ink-400" />
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
            <div className="mt-3 bg-cream-50/80 rounded-none border-2 border-ochre-400 shadow-warm-sm font-serif">
              <div className="p-4 border-b border-cream-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchWordOrMeaning || '搜索单词或释义...'}
                    className="input-warm w-full pl-9 pr-9 py-2.5 text-sm bg-transparent border-2 border-ochre-400 rounded-none font-serif focus:outline-none focus:bg-ochre-400/5 placeholder-ink-400 transition-colors duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-ink-400 hover:text-ink-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-xs text-ink-400">
                    {loading ? (t.loading || '加载中...') : (t.totalWordCount || '共 {0} 个单词').replace('{0}', filteredWords.length)}
                  </span>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
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
