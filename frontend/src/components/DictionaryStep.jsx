import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shuffle, Loader2, Languages, BookOpen, Search, Volume2, ArrowLeft, Pencil, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import WordDetail from './WordDetail'
import SentenceDetail from './SentenceDetail'
import { groupVocab } from '../utils/vocab'
import { speakText } from '../utils/speech'
import { LangIcon, LANGUAGES } from './InputStep'
import { api } from '../utils/api'

function DictionaryStep({ vocab, onToggleSort, sortOrder, progress, processingInfo, sentenceTranslations, selectedSentence, selectedWord, onSentenceClick, onCloseSentenceDetail, onWordClick, onStartLearning, loading, t, currentFileId, sourceLang, targetLang, preprocessStatus, onBack, fileTitle, onTitleChange, pageSize = 50 }) {
  const [expandedWord, setExpandedWord] = useState(null)
  const [wordDetailCache, setWordDetailCache] = useState({})
  const [loadingWords, setLoadingWords] = useState({})
  const [wordDetails, setWordDetails] = useState({})
  const [sentenceSearch, setSentenceSearch] = useState('')
  const [vocabSearch, setVocabSearch] = useState('')
  const [sentenceDisplayMode, setSentenceDisplayMode] = useState(0)
  const [vocabDisplayMode, setVocabDisplayMode] = useState(0)
  const [showOriginal, setShowOriginal] = useState(false)
  const [showGlobalVocab, setShowGlobalVocab] = useState(false)
  const [globalVocab, setGlobalVocab] = useState([])
  const [globalVocabLoading, setGlobalVocabLoading] = useState(false)
  const [actualSourceLang, setActualSourceLang] = useState(sourceLang)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [vocabPage, setVocabPage] = useState(1)
  const [sentencePage, setSentencePage] = useState(1)
  const [globalVocabPage, setGlobalVocabPage] = useState(1)
  const vocabListRef = useRef(null)
  const wordRefs = useRef({})
  const sentenceRefs = useRef({})
  const titleInputRef = useRef(null)
  const pendingScrollWord = useRef(null)
  const localVocabScrollPos = useRef(0)
  const globalVocabScrollPos = useRef(0)
  const filteredVocabRef = useRef([])
  const vocabPageRef = useRef(1)
  const pageSizeRef = useRef(pageSize)

  useEffect(() => {
    if (currentFileId) {
      fetch(`/api/file/${currentFileId}/info`)
        .then(r => r.json())
        .then(data => {
          const lang = data.source_lang
          if (lang && lang !== 'auto') {
            setActualSourceLang(lang)
          }
        })
        .catch(() => {
          fetch(`/api/status/${currentFileId}`)
            .then(r => r.json())
            .then(data => {
              const lang = data.source_lang || sourceLang
              if (lang && lang !== 'auto') {
                setActualSourceLang(lang)
              }
            })
            .catch(() => {})
        })
    }
    if (sourceLang && sourceLang !== 'auto') {
      setActualSourceLang(sourceLang)
    }
  }, [currentFileId, sourceLang])

  useEffect(() => {
    if (!showGlobalVocab) return
    const lang = actualSourceLang && actualSourceLang !== 'auto' ? actualSourceLang : sourceLang
    if (!lang) return
    let cancelled = false
    setGlobalVocabLoading(true)
    api.getWordList(lang).then(data => {
      if (!cancelled) {
        setGlobalVocab(data.words || [])
        setGlobalVocabLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setGlobalVocabLoading(false)
    })
    return () => { cancelled = true }
  }, [showGlobalVocab, actualSourceLang, sourceLang])

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
      (w.meaning && w.meaning.toLowerCase().includes(q)) ||
      (w.context_meaning && w.context_meaning.toLowerCase().includes(q))
    )
  }, [vocab, vocabSearch])

  filteredVocabRef.current = filteredVocab
  vocabPageRef.current = vocabPage
  pageSizeRef.current = pageSize

  const pagedFilteredVocab = useMemo(() => {
    const start = (vocabPage - 1) * pageSize
    return filteredVocab.slice(start, start + pageSize)
  }, [filteredVocab, vocabPage, pageSize])

  const pagedFilteredSentences = useMemo(() => {
    const start = (sentencePage - 1) * pageSize
    return filteredSentences.slice(start, start + pageSize)
  }, [filteredSentences, sentencePage, pageSize])

  const filteredGlobalVocab = useMemo(() => {
    if (!vocabSearch.trim()) return globalVocab
    const q = vocabSearch.toLowerCase()
    return globalVocab.filter(w =>
      w.word.toLowerCase().includes(q) ||
      (w.meaning && w.meaning.toLowerCase().includes(q))
    )
  }, [globalVocab, vocabSearch])

  const pagedFilteredGlobalVocab = useMemo(() => {
    const start = (globalVocabPage - 1) * pageSize
    return filteredGlobalVocab.slice(start, start + pageSize)
  }, [filteredGlobalVocab, globalVocabPage, pageSize])

  const groupedVocab = useMemo(() => {
    return groupVocab(pagedFilteredVocab)
  }, [pagedFilteredVocab])

  const letterIndex = useMemo(() => {
    return groupedVocab.map(([letter]) => letter)
  }, [groupedVocab])

  const groupedGlobalVocab = useMemo(() => {
    return groupVocab(pagedFilteredGlobalVocab)
  }, [pagedFilteredGlobalVocab])

  const globalLetterIndex = useMemo(() => {
    return groupedGlobalVocab.map(([letter]) => letter)
  }, [groupedGlobalVocab])

  const allLetterIndex = useMemo(() => {
    return groupVocab(filteredVocab).map(([letter]) => letter)
  }, [filteredVocab])

  const allGlobalLetterIndex = useMemo(() => {
    return groupVocab(filteredGlobalVocab).map(([letter]) => letter)
  }, [filteredGlobalVocab])

  const vocabTotalPages = useMemo(() => Math.max(1, Math.ceil(filteredVocab.length / pageSize)), [filteredVocab, pageSize])
  const sentenceTotalPages = useMemo(() => Math.max(1, Math.ceil(filteredSentences.length / pageSize)), [filteredSentences, pageSize])
  const globalVocabTotalPages = useMemo(() => Math.max(1, Math.ceil(filteredGlobalVocab.length / pageSize)), [filteredGlobalVocab, pageSize])

  useEffect(() => {
    setVocabPage(1)
    setSentencePage(1)
    setGlobalVocabPage(1)
  }, [pageSize])

  useEffect(() => {
    if (vocabPage > vocabTotalPages) setVocabPage(vocabTotalPages)
  }, [vocabPage, vocabTotalPages])

  useEffect(() => {
    if (sentencePage > sentenceTotalPages) setSentencePage(sentenceTotalPages)
  }, [sentencePage, sentenceTotalPages])

  useEffect(() => {
    if (globalVocabPage > globalVocabTotalPages) setGlobalVocabPage(globalVocabTotalPages)
  }, [globalVocabPage, globalVocabTotalPages])

  const handleToggleGlobalVocab = useCallback(() => {
    if (vocabListRef.current) {
      if (showGlobalVocab) {
        globalVocabScrollPos.current = vocabListRef.current.scrollTop
      } else {
        localVocabScrollPos.current = vocabListRef.current.scrollTop
      }
    }
    setShowGlobalVocab(v => !v)
  }, [showGlobalVocab])

  useEffect(() => {
    if (vocabListRef.current && !globalVocabLoading) {
      if (!showGlobalVocab && pendingScrollWord.current) return
      const targetPos = showGlobalVocab ? globalVocabScrollPos.current : localVocabScrollPos.current
      vocabListRef.current.scrollTop = targetPos
    }
  }, [showGlobalVocab, globalVocabLoading])

  const scrollToLetter = (letter) => {
    const el = document.getElementById(`dict-group-${letter}`)
    if (el && vocabListRef.current) {
      const container = vocabListRef.current
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const stickyOffset = 32
      const scrollOffset = elRect.top - containerRect.top + container.scrollTop - stickyOffset
      container.scrollTo({ top: scrollOffset, behavior: 'smooth' })
    } else {
      const currentList = showGlobalVocab ? filteredGlobalVocab : filteredVocab
      const letterLower = letter.toLowerCase()
      const wordIdx = currentList.findIndex(w => w.word.charAt(0).toUpperCase() === letter || w.word.charAt(0).toLowerCase() === letterLower)
      if (wordIdx >= 0) {
        const targetPage = Math.floor(wordIdx / pageSize) + 1
        const currentPage = showGlobalVocab ? globalVocabPage : vocabPage
        if (targetPage !== currentPage) {
          if (showGlobalVocab) {
            setGlobalVocabPage(targetPage)
          } else {
            setVocabPage(targetPage)
          }
        }
      }
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
        let data
        try {
          data = await response.json()
        } catch {
          if (retries > 0) {
            await new Promise(r => setTimeout(r, 2000))
            return waitForDetail(retries - 1)
          }
          return null
        }
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

  const scrollToWord = useCallback((wordKey, delay = 50) => {
    const doScroll = () => {
      let el = wordRefs.current[wordKey]
      if (!el && vocabListRef.current) {
        el = vocabListRef.current.querySelector(`[data-word-key="${CSS.escape(wordKey)}"]`)
      }
      if (el && vocabListRef.current) {
        const container = vocabListRef.current
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const stickyOffset = 36
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
    if (!showGlobalVocab && pendingScrollWord.current) {
      const wordKey = pendingScrollWord.current
      pendingScrollWord.current = null
      scrollToWord(wordKey, 200)
    }
  }, [showGlobalVocab, scrollToWord, vocabPage])

  useEffect(() => {
    if (expandedWord && !expandedWord.startsWith('global-') && !showGlobalVocab) {
      scrollToWord(expandedWord, 200)
    }
  }, [expandedWord, showGlobalVocab, scrollToWord, vocabPage])

  const handleTokenClick = useCallback(async (sourceWord) => {
    const sourceLower = sourceWord.toLowerCase()
    const sourceNoHyphen = sourceLower.replace(/-/g, ' ')
    const sourceStripped = stripEdgePunct(sourceLower)
    const matchedWord = vocab.find(w => {
      const wordLower = w.word.toLowerCase()
      if (wordLower === sourceLower) return true
      if (wordLower === sourceNoHyphen) return true
      if (wordLower.replace(/-/g, ' ') === sourceLower) return true
      if (w.tokens && w.tokens.some(t => t.toLowerCase() === sourceLower)) return true
      if (sourceStripped && sourceStripped !== sourceLower && wordLower === sourceStripped) return true
      if (sourceStripped && sourceStripped !== sourceLower && w.tokens && w.tokens.some(t => t.toLowerCase() === sourceStripped)) return true
      return false
    })

    if (!matchedWord) return

    const wordKey = matchedWord.word
    if (expandedWord === wordKey) {
      setExpandedWord(null)
      return
    }
    setExpandedWord(wordKey)

    const currentFilteredVocab = filteredVocabRef.current
    const currentPage = vocabPageRef.current
    const currentPageSize = pageSizeRef.current

    if (showGlobalVocab) {
      if (vocabListRef.current) {
        globalVocabScrollPos.current = vocabListRef.current.scrollTop
      }
      pendingScrollWord.current = wordKey
      if (vocabSearch) setVocabSearch('')
      const wordIdx = currentFilteredVocab.findIndex(w => w.word.toLowerCase() === wordKey.toLowerCase())
      if (wordIdx >= 0) {
        const targetPage = Math.floor(wordIdx / currentPageSize) + 1
        if (targetPage !== currentPage) setVocabPage(targetPage)
      }
      setShowGlobalVocab(false)
    } else {
      if (vocabSearch) setVocabSearch('')
      const wordIdx = currentFilteredVocab.findIndex(w => w.word.toLowerCase() === wordKey.toLowerCase())
      if (wordIdx >= 0) {
        const targetPage = Math.floor(wordIdx / currentPageSize) + 1
        if (targetPage !== currentPage) {
          setVocabPage(targetPage)
          pendingScrollWord.current = wordKey
        } else {
          scrollToWord(wordKey, 200)
        }
      }
    }

    speakText(wordKey, sourceLang)
    fetchWordDetail(wordKey)
  }, [vocab, expandedWord, scrollToWord, fetchWordDetail, showGlobalVocab])

  const handleVocabWordClick = useCallback(async (word) => {
    const wordKey = word.word
    if (expandedWord === wordKey) {
      setExpandedWord(null)
      return
    }
    setExpandedWord(wordKey)
    scrollToWord(wordKey, 200)
    fetchWordDetail(wordKey)
  }, [expandedWord, fetchWordDetail, scrollToWord])

  const scrollToGlobalWord = useCallback((wordKey, delay = 50) => {
    const doScroll = () => {
      if (!vocabListRef.current) return
      const el = vocabListRef.current.querySelector(`[data-global-word-key="${CSS.escape(wordKey)}"]`)
      if (el) {
        const container = vocabListRef.current
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const stickyOffset = 36
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

  const handleGlobalVocabWordClick = useCallback(async (word) => {
    const globalKey = `global-${word.word}`
    if (expandedWord === globalKey) {
      setExpandedWord(null)
      return
    }
    setExpandedWord(globalKey)
    scrollToGlobalWord(word.word, 200)

    const hasDetail = word && (word.examples?.length > 0 || word.memory_hint || word.variants_detail?.length > 0)
    if (hasDetail) {
      setWordDetails(prev => ({ ...prev, [globalKey]: word }))
      return
    }

    if (!wordDetails[globalKey] && !loadingWords[globalKey]) {
      setLoadingWords(prev => ({ ...prev, [globalKey]: true }))
      try {
        const detail = await api.getWordDetail(word.word, actualSourceLang)
        setWordDetails(prev => ({ ...prev, [globalKey]: detail }))
      } catch (err) {
        console.error('Failed to load global word detail:', err)
      } finally {
        setLoadingWords(prev => ({ ...prev, [globalKey]: false }))
      }
    }
  }, [expandedWord, wordDetails, loadingWords, actualSourceLang])

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

  const handleRegenerateWord = useCallback(async (wordKey, isGlobal = false) => {
    const key = isGlobal ? `global-${wordKey}` : wordKey
    setWordDetails(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setWordDetailCache(prev => {
      const next = { ...prev }
      delete next[wordKey]
      return next
    })
    setLoadingWords(prev => ({ ...prev, [key]: true }))
    try {
      await api.regenerateWord(currentFileId, wordKey)
      const waitForDetail = async (retries = 30) => {
        const response = await fetch(`/api/word/${currentFileId}/${wordKey}`)
        let data
        try {
          data = await response.json()
        } catch {
          if (retries > 0) {
            await new Promise(r => setTimeout(r, 2000))
            return waitForDetail(retries - 1)
          }
          return null
        }
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
      if (data) {
        setWordDetails(prev => ({ ...prev, [key]: data }))
        setWordDetailCache(prev => ({ ...prev, [wordKey]: data }))
      }
    } catch (e) {
      console.error('Failed to regenerate word:', e)
    } finally {
      setLoadingWords(prev => ({ ...prev, [key]: false }))
    }
  }, [currentFileId])

  const handleTitleClick = useCallback(() => {
    setTitleInput(fileTitle)
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 50)
  }, [fileTitle])

  const handleTitleSave = useCallback(() => {
    const trimmed = titleInput.trim()
    if (trimmed && trimmed !== fileTitle && currentFileId) {
      api.renameHistory(currentFileId, trimmed)
      if (onTitleChange) onTitleChange(trimmed)
    }
    setEditingTitle(false)
  }, [titleInput, fileTitle, currentFileId, onTitleChange])

  const handleTitleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleTitleSave()
    if (e.key === 'Escape') setEditingTitle(false)
  }, [handleTitleSave])

  const stripEdgePunct = (text) => {
    return text.replace(/^[^\w\u00C0-\u024F\u0400-\u052F\u0370-\u03FF\u0600-\u06FF\u0900-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF]+|[^\w\u00C0-\u024F\u0400-\u052F\u0370-\u03FF\u0600-\u06FF\u0900-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF]+$/g, '')
  }

  const findVocabWordBySourceText = useCallback((sourceText) => {
    const sourceLower = sourceText.toLowerCase()
    const sourceNoHyphen = sourceLower.replace(/-/g, ' ')
    const sourceStripped = stripEdgePunct(sourceLower)
    return vocab.some(w => {
      const wordLower = w.word.toLowerCase()
      if (wordLower === sourceLower) return true
      if (wordLower === sourceNoHyphen) return true
      if (wordLower.replace(/-/g, ' ') === sourceLower) return true
      if (w.tokens && w.tokens.some(t => t.toLowerCase() === sourceLower)) return true
      if (sourceStripped && sourceStripped !== sourceLower && wordLower === sourceStripped) return true
      if (sourceStripped && sourceStripped !== sourceLower && w.tokens && w.tokens.some(t => t.toLowerCase() === sourceStripped)) return true
      return false
    })
  }, [vocab])

  const renderOriginalSentence = (item) => {
    const sentence = item.sentence || ''
    const tr = item.translation_result
    const tokens = (tr && tr.translation && Array.isArray(tr.translation)) ? tr.translation : null

    const tokenTexts = tokens
      ? tokens.filter(t => typeof t === 'object' && t.text).flatMap(t => {
          const raw = t.text
          const stripped = stripEdgePunct(raw)
          return stripped && stripped !== raw ? [raw, stripped] : [raw]
        })
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
    return <div className={`text-stone-600 text-sm ${sentenceDisplayMode === 1 ? 'invisible' : ''}`}>{text}</div>
  }

  const renderPagination = (currentPage, totalPages, onPageChange) => {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-center gap-1 py-1.5 border-t border-stone-200/60 bg-stone-50/40">
        <button
          onClick={() => onPageChange(p => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className={`p-1 rounded transition-colors ${currentPage <= 1 ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => {
          if (totalPages <= 7) return true
          if (p === 1 || p === totalPages) return true
          if (Math.abs(p - currentPage) <= 1) return true
          return false
        }).reduce((acc, p, i, arr) => {
          if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
          acc.push(p)
          return acc
        }, []).map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="text-[10px] text-stone-300 px-0.5">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[22px] h-[22px] flex items-center justify-center text-[10px] rounded transition-colors ${
                currentPage === p
                  ? 'bg-amber-100 text-amber-700 font-semibold'
                  : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          className={`p-1 rounded transition-colors ${currentPage >= totalPages ? 'text-stone-200 cursor-not-allowed' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-3"
      style={{ height: '100%' }}
    >
      <div className="flex items-center gap-3 px-1">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          title={t.backToHome || '返回主页'}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <LangIcon langCode={actualSourceLang} size="sm" />
          <span className="text-[13px] font-semibold text-stone-700">
            {LANGUAGES.find(l => l.value === actualSourceLang)?.en || actualSourceLang?.toUpperCase()}
          </span>
        </div>

        {fileTitle && !editingTitle && (
          <button
            onClick={handleTitleClick}
            className="flex items-center gap-1.5 max-w-[250px] group"
          >
            <span className="truncate text-[15px] font-medium text-stone-600 group-hover:text-stone-800 transition-colors">{fileTitle}</span>
            <Pencil className="w-2.5 h-2.5 text-stone-300 group-hover:text-stone-400 shrink-0 transition-colors" />
          </button>
        )}

        {editingTitle && (
          <input
            ref={titleInputRef}
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="text-[13px] font-medium text-stone-600 bg-transparent border-b border-stone-300 px-1 py-0.5 max-w-[250px] focus:outline-none focus:border-amber-400 transition-colors"
          />
        )}

        <div className="flex-1 min-w-0" />

        {currentFileId && (preprocessStatus || (processingInfo && safeProcessingInfo.total > 0 && progress < 100)) && (
          <div className="flex items-center gap-2.5 shrink-0">
            {preprocessStatus ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                </span>
                <span className="text-[11px] text-blue-500 font-medium truncate">
                  {preprocessStatus === 'detecting' ? (t.detectingLanguage || '识别语言中...') : 
                   preprocessStatus === 'translating' ? (t.translating || '翻译中...') : (t.generating || '生成文本中...')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-400 tabular-nums whitespace-nowrap">
                  {safeProcessingInfo.current}/{safeProcessingInfo.total}
                </span>
                <div className="h-1 bg-stone-100 rounded-full overflow-hidden w-24">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="h-full bg-stone-400 rounded-full"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStartLearning}
          disabled={loading || !!preprocessStatus || vocab.length === 0}
          className="px-4 py-2 bg-stone-800 text-white text-[12px] font-medium rounded-xl hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shrink-0 shadow-sm"
        >
          {(loading || preprocessStatus) ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t.preparing}
            </>
          ) : (
            <>
              <Shuffle className="w-3.5 h-3.5" />
              {t.startLearning || '开始学习'}
            </>
          )}
        </motion.button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0" style={{ overflow: 'hidden' }}>
        <div className="w-1/2 flex flex-col min-h-0" style={{ overflow: 'hidden' }}>
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="px-5 py-3.5 border-b border-stone-200/80 bg-stone-50/60">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 shrink-0" style={{ minWidth: '140px' }}>
                  <Languages className={`w-4 h-4 transition-colors cursor-pointer ${sentenceDisplayMode !== 0 ? 'text-amber-500' : 'text-stone-500 hover:text-amber-500'}`} onClick={(e) => { e.stopPropagation(); setSentenceDisplayMode(v => (v + 1) % 3) }} title={sentenceDisplayMode === 0 ? '显示全部' : sentenceDisplayMode === 1 ? '隐藏翻译' : '隐藏原文'} />
                  <h3 className="text-sm font-semibold text-stone-700">
                    <span className="cursor-pointer select-none" onClick={() => setShowOriginal(v => !v)}>
                      <span className={!showOriginal ? 'font-semibold text-stone-700' : 'font-normal text-stone-400'}>{t.sentTranslation}</span>
                      <span className="text-stone-300 mx-1.5">/</span>
                      <span className={showOriginal ? 'font-semibold text-stone-700' : 'font-normal text-stone-400'}>{t.showOriginal}</span>
                    </span>
                  </h3>
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
            <div className="flex-1 overflow-y-scroll min-h-0" style={{ scrollbarGutter: 'stable' }}>
              {showOriginal ? (
                <div className="p-4">
                  <pre className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap font-sans">{safeSentenceTranslations.map(item => item.sentence || '').join('\n')}</pre>
                </div>
              ) : filteredSentences.length > 0 ? (
                <div className="divide-y divide-stone-200/60">
                  {pagedFilteredSentences.map((item, index) => {
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
                              <div className={sentenceDisplayMode === 2 && selectedSentence !== originalIndex ? 'invisible' : ''}>
                                {renderOriginalSentence(item)}
                              </div>
                              <div className={`text-stone-600 text-sm ${sentenceDisplayMode === 1 && selectedSentence !== originalIndex ? 'invisible' : ''}`}>
                                {item.translation_result?.tokenized_translation || ''}
                              </div>
                            </div>
                            <Volume2 className="w-3.5 h-3.5 text-stone-300 hover:text-amber-600 shrink-0 mt-1 transition-colors" onClick={(e) => speakWord(item.sentence || '', e)} />
                          </div>
                        </motion.div>
                        <AnimatePresence>
                          {selectedSentence === originalIndex && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-stone-200/60 p-4 bg-stone-50/50">
                                <SentenceDetail
                                  sentenceTranslation={safeSentenceTranslations[originalIndex]}
                                  t={t}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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
            {renderPagination(sentencePage, sentenceTotalPages, setSentencePage)}
          </div>
        </div>

        <div className="w-1/2 flex flex-col min-h-0" style={{ overflow: 'hidden' }}>
          <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="px-5 py-3.5 border-b border-stone-200/80 bg-stone-50/60">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 shrink-0" style={{ minWidth: '140px' }}>
                  <BookOpen className={`w-4 h-4 transition-colors cursor-pointer ${vocabDisplayMode !== 0 ? 'text-amber-500' : 'text-stone-500 hover:text-amber-500'}`} onClick={(e) => { e.stopPropagation(); setVocabDisplayMode(v => (v + 1) % 3) }} title={vocabDisplayMode === 0 ? '显示全部' : vocabDisplayMode === 1 ? '隐藏释义' : '隐藏单词'} />
                  <h3 className="text-sm font-semibold text-stone-700">
                    <span className="cursor-pointer select-none" onClick={handleToggleGlobalVocab}>
                      <span className={!showGlobalVocab ? 'font-semibold text-stone-700' : 'font-normal text-stone-400'}>{t.vocabList}</span>
                      <span className="text-stone-300 mx-1.5">/</span>
                      <span className={showGlobalVocab ? 'font-semibold text-stone-700' : 'font-normal text-stone-400'}>{t.globalVocabList}</span>
                    </span>
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {showGlobalVocab ? filteredGlobalVocab.length : filteredVocab.length}
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
            <div className="flex-1 flex min-h-0">
              {((!showGlobalVocab && allLetterIndex.length > 1) || (showGlobalVocab && allGlobalLetterIndex.length > 1)) && (
                <div className="hidden md:flex flex-col items-center gap-0.5 py-2 border-r border-stone-200/60 bg-stone-50/40 w-7 shrink-0 overflow-y-auto">
                  {(showGlobalVocab ? allGlobalLetterIndex : allLetterIndex).map(letter => {
                    const currentIdx = showGlobalVocab ? globalLetterIndex : letterIndex
                    const onCurrentPage = currentIdx.includes(letter)
                    return (
                      <button
                        key={letter}
                        onClick={() => scrollToLetter(letter)}
                        className={`w-5 h-5 flex items-center justify-center text-[9px] font-semibold rounded transition-colors shrink-0 ${
                          onCurrentPage
                            ? 'text-stone-600 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-stone-300 hover:text-amber-500 hover:bg-amber-50/50'
                        }`}
                      >
                        {letter}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex-1 overflow-y-scroll min-h-0" ref={vocabListRef} style={{ scrollbarGutter: 'stable' }}>
              {showGlobalVocab ? (
                globalVocabLoading ? (
                  <div className="py-16 text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-amber-400" />
                    <p className="text-stone-400 text-sm">{t.loading}</p>
                  </div>
                ) : groupedGlobalVocab.length === 0 ? (
                  <div className="py-16 text-center">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                    <p className="text-stone-400 text-sm">{vocabSearch ? '没有找到匹配的单词' : t.noWordsYetHint || '暂无单词'}</p>
                  </div>
                ) : (
                <div className="space-y-3">
                  {groupedGlobalVocab.map(([letter, words], groupIdx) => (
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
                          const isExpanded = expandedWord === `global-${wordKey}`
                          const isLoading = loadingWords[`global-${wordKey}`]
                          const detail = wordDetails[`global-${wordKey}`]
                          return (
                            <motion.div
                              key={wordKey}
                              data-global-word-key={wordKey}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: groupIdx * 0.03 + index * 0.015 }}
                              className="bg-white"
                            >
                              <button
                                onClick={() => handleGlobalVocabWordClick(word)}
                                className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-amber-50/40 transition-colors group"
                              >
                                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap select-text">
                                  <span className={`text-[14px] font-semibold text-stone-800 tracking-tight shrink-0 ${vocabDisplayMode === 2 && !isExpanded ? 'invisible' : ''}`}>
                                    {word.word}
                                  </span>
                                  {word.ipa && (
                                    <span className={`text-[11px] text-stone-400 ipa-font shrink-0 ${vocabDisplayMode === 2 && !isExpanded ? 'invisible' : ''}`}>
                                      {word.ipa.startsWith('/') ? word.ipa : `/${word.ipa}/`}
                                    </span>
                                  )}
                                  {word.part_of_speech && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded font-medium tracking-wide shrink-0">
                                      {word.part_of_speech}
                                    </span>
                                  )}
                                  <span className={`text-[12px] text-stone-500 truncate ${vocabDisplayMode === 1 && !isExpanded ? 'invisible' : ''}`}>
                                    {word.meaning}
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
                                        <div className="pt-3 relative">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleRegenerateWord(wordKey, true) }}
                                            className="absolute -top-1 right-0 p-1.5 text-stone-300 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
                                            title="重新生成"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                          </button>
                                          <WordDetail word={detail} t={t} onSentenceClick={handleSentenceJump} sourceLang={actualSourceLang} hideContextSentences={showGlobalVocab} />
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
                )
              ) : (
              <>
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
                            data-word-key={wordKey}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: groupIdx * 0.03 + index * 0.015 }}
                            className="bg-white"
                          >
                            <button
                              onClick={() => handleVocabWordClick(word)}
                              className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-amber-50/40 transition-colors group"
                            >
                              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap select-text">
                                <span className={`text-[14px] font-semibold text-stone-800 tracking-tight shrink-0 ${vocabDisplayMode === 2 && !isExpanded ? 'invisible' : ''}`}>
                                  {word.word}
                                </span>
                                {word.ipa && (
                                  <span className={`text-[11px] text-stone-400 ipa-font shrink-0 ${vocabDisplayMode === 2 && !isExpanded ? 'invisible' : ''}`}>
                                    {word.ipa.startsWith('/') ? word.ipa : `/${word.ipa}/`}
                                  </span>
                                )}
                                {word.morphology && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded font-medium tracking-wide shrink-0">
                                    {word.morphology}
                                  </span>
                                )}
                                <span className={`text-[12px] text-stone-500 truncate ${vocabDisplayMode === 1 && !isExpanded ? 'invisible' : ''}`}>
                                  {word.meaning || word.context_meaning}
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
                                      <div className="pt-3 relative">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleRegenerateWord(wordKey, false) }}
                                          className="absolute -top-1 right-0 p-1.5 text-stone-300 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
                                          title="重新生成"
                                        >
                                          <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
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
              </>
              )}
              </div>
            </div>
            {showGlobalVocab
              ? renderPagination(globalVocabPage, globalVocabTotalPages, setGlobalVocabPage)
              : renderPagination(vocabPage, vocabTotalPages, setVocabPage)
            }
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default DictionaryStep
