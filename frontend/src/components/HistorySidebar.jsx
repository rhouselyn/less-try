import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2, MessageSquare, BookOpen, Volume2, Search, X, ChevronDown, Loader2, Brain, Lightbulb, GitBranch, Tag } from 'lucide-react'
import { api } from '../utils/api'
import { speakText } from '../utils/speech'

const LANG_LABELS = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  ja: '日本語',
  ko: '한국어',
  pt: 'Português',
  ru: 'Русский',
  it: 'Italiano',
  ar: 'العربية',
  hi: 'हिन्दी',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa',
  tr: 'Türkçe',
  nl: 'Nederlands',
  sv: 'Svenska',
  pl: 'Polski',
  uk: 'Українська'
}

const LANG_ICONS = {
  en: '🇬🇧',
  zh: '🇨🇳',
  es: '🇪🇸',
  de: '🇩🇪',
  fr: '🇫🇷',
  ja: '🇯🇵',
  ko: '🇰🇷',
  pt: '🇧🇷',
  ru: '🇷🇺',
  it: '🇮🇹',
  ar: '🇸🇦',
  hi: '🇮🇳',
  th: '🇹🇭',
  vi: '🇻🇳',
  id: '🇮🇩',
  tr: '🇹🇷',
  nl: '🇳🇱',
  sv: '🇸🇪',
  pl: '🇵🇱',
  uk: '🇺🇦'
}

function CompactWordDetail({ word, sourceLang }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="px-3 pb-2.5 pt-1.5 space-y-2 border-t border-stone-100">
        {word.meaning && (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Brain className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">释义</span>
            </div>
            <p className="text-[11px] text-stone-700 leading-relaxed pl-4">{word.meaning}</p>
          </div>
        )}

        {word.context_sentences && word.context_sentences.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <BookOpen className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">例句</span>
            </div>
            <div className="pl-4 space-y-1">
              {word.context_sentences.slice(0, 2).map((cs, i) => (
                <div key={i} className="text-[11px]">
                  <div className="flex items-start gap-1">
                    <p className="text-stone-700 flex-1">{cs.sentence || cs}</p>
                    {cs.sentence && (
                      <button
                        onClick={(e) => { e.stopPropagation(); speakText(cs.sentence, sourceLang) }}
                        className="p-0.5 text-amber-400 hover:text-amber-600 rounded transition-colors shrink-0"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {cs.translation && (
                    <p className="text-stone-500 text-[10px] mt-0.5">{cs.translation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {word.ipa && (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Tag className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">音标</span>
            </div>
            <p className="text-[11px] text-stone-700 pl-4 ipa-font">
              {word.ipa.startsWith('/') ? word.ipa : `/${word.ipa}/`}
            </p>
          </div>
        )}

        {word.part_of_speech && (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Tag className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">词性</span>
            </div>
            <p className="text-[11px] text-stone-700 pl-4">{word.part_of_speech}</p>
          </div>
        )}

        {word.memory_hint && (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">记忆辅助</span>
            </div>
            <p className="text-[11px] text-stone-700 pl-4 bg-amber-50/60 p-1.5 rounded border border-amber-100/60">
              {word.memory_hint}
            </p>
          </div>
        )}

        {word.variants_detail && word.variants_detail.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <GitBranch className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">变体</span>
            </div>
            <div className="pl-4 flex flex-wrap gap-1">
              {word.variants_detail.map((v, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 text-stone-700 rounded text-[10px]">
                  <span className="text-stone-400 font-medium">{v.type}</span>
                  <span>{v.form}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function ContextMenu({ x, y, onRename, onDelete, onClose, t }) {
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const menuW = 160
  const menuH = 80
  const vw = window.innerWidth
  const vh = window.innerHeight
  const posX = x + menuW > vw ? vw - menuW - 8 : x
  const posY = y + menuH > vh ? vh - menuH - 8 : y

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{ left: posX, top: posY }}
      className="fixed z-[9999] bg-white border border-stone-200 rounded-xl shadow-xl shadow-black/8 py-1.5 min-w-[160px] overflow-hidden"
    >
      <button
        onClick={() => { onRename(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-stone-700 hover:bg-stone-50 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-stone-400" />
        {t.rename || '重命名'}
      </button>
      <div className="mx-2.5 my-0.5 border-t border-stone-100" />
      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {t.delete || '删除'}
      </button>
    </motion.div>
  )
}

function HistoryItem({ record, isRenaming, renameValue, onRenameStart, onRenameConfirm, onRenameCancel, onRenameChange, onNavigate, onMenuOpen, t }) {
  const renameRef = useRef(null)

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus()
      renameRef.current.select()
    }
  }, [isRenaming])

  if (isRenaming) {
    return (
      <div className="px-2.5 py-1.5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <input
            ref={renameRef}
            type="text"
            value={renameValue}
            onChange={e => onRenameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onRenameConfirm()
              if (e.key === 'Escape') onRenameCancel()
            }}
            className="flex-1 text-[13px] px-2 py-1 border border-stone-300 rounded-md focus:outline-none focus:ring-1.5 focus:ring-stone-400 bg-white text-stone-800"
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-stone-100/70 transition-colors mx-2"
      onClick={() => onNavigate(record.file_id, record.source_lang, record.target_lang)}
    >
      <MessageSquare className="w-3.5 h-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-stone-700 truncate leading-snug">
          {record.title}
        </div>
      </div>
      <button
        onClick={e => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          onMenuOpen(record.file_id, rect.right - 160, rect.bottom + 4)
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-stone-200/70 text-stone-400 hover:text-stone-600 transition-all flex-shrink-0"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function HistorySidebar({ onNavigateToRecord, t }) {
  const [expanded, setExpanded] = useState(true)
  const [records, setRecords] = useState([])
  const [menuState, setMenuState] = useState({ open: false, fileId: null, x: 0, y: 0 })
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [wordListLang, setWordListLang] = useState(null)
  const [words, setWords] = useState([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [wordSearch, setWordSearch] = useState('')
  const [expandedWord, setExpandedWord] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const data = await api.getHistory()
      setRecords(data.records || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const grouped = records.reduce((acc, record) => {
    const lang = record.source_lang || 'other'
    if (!acc[lang]) acc[lang] = []
    acc[lang].push(record)
    return acc
  }, {})

  const handleDelete = async (fileId) => {
    try {
      await api.deleteHistory(fileId)
      setRecords(prev => prev.filter(r => r.file_id !== fileId))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleRenameStart = useCallback((fileId) => {
    const record = records.find(r => r.file_id === fileId)
    if (record) {
      setRenamingId(fileId)
      setRenameValue(record.title)
    }
  }, [records])

  const handleRenameConfirm = async () => {
    if (!renameValue.trim()) return
    try {
      await api.renameHistory(renamingId, renameValue.trim())
      setRecords(prev => prev.map(r =>
        r.file_id === renamingId ? { ...r, title: renameValue.trim() } : r
      ))
    } catch (err) {
      console.error('Failed to rename:', err)
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null)
    setRenameValue('')
  }, [])

  const handleMenuOpen = useCallback((fileId, x, y) => {
    setMenuState({ open: true, fileId, x, y })
  }, [])

  const handleMenuClose = useCallback(() => {
    setMenuState(prev => ({ ...prev, open: false }))
  }, [])

  const toggleWordList = useCallback(async (lang) => {
    if (wordListLang === lang) {
      setWordListLang(null)
      setWords([])
      setWordSearch('')
      setExpandedWord(null)
      return
    }
    setWordListLang(lang)
    setWords([])
    setWordSearch('')
    setExpandedWord(null)
    setWordsLoading(true)
    try {
      const data = await api.getWordList(lang)
      setWords(data.words || [])
    } catch (err) {
      console.error('Failed to load word list:', err)
    } finally {
      setWordsLoading(false)
    }
  }, [wordListLang])

  const filteredWords = wordSearch.trim()
    ? words.filter(w =>
        w.word.toLowerCase().includes(wordSearch.toLowerCase()) ||
        (w.meaning && w.meaning.toLowerCase().includes(wordSearch.toLowerCase()))
      )
    : words

  return (
    <>
      <div className="flex h-full">
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full overflow-hidden flex flex-col bg-stone-50 border-r border-stone-200/80"
              style={{ minWidth: 0 }}
            >
              <div className="px-3 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  {t.historyTitle || '学习记录'}
                </span>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1 rounded-md hover:bg-stone-200/60 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                {Object.keys(grouped).length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <div className="text-2xl mb-2">📚</div>
                    <div className="text-[13px] text-stone-400">
                      {t.noHistory || '暂无学习记录'}
                    </div>
                  </div>
                )}

                {Object.entries(grouped).map(([lang, items]) => (
                  <div key={lang} className="mb-1">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 mt-1">
                      <span className="text-xs">{LANG_ICONS[lang] || '📝'}</span>
                      <span className="text-[11px] font-medium text-stone-400 tracking-wide">
                        {LANG_LABELS[lang] || lang}
                      </span>
                      <span className="text-[10px] text-stone-300">{items.length}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleWordList(lang) }}
                        className={`ml-auto p-0.5 rounded transition-colors ${wordListLang === lang ? 'text-amber-500 hover:text-amber-600' : 'text-stone-300 hover:text-amber-500'}`}
                        title="Word list"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <AnimatePresence>
                      {wordListLang === lang && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="mx-2 mb-1.5 bg-white/80 rounded-lg border border-stone-200/60 shadow-sm">
                            <div className="p-2 border-b border-stone-100">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400" />
                                <input
                                  type="text"
                                  value={wordSearch}
                                  onChange={(e) => setWordSearch(e.target.value)}
                                  placeholder="搜索单词..."
                                  className="w-full pl-6 pr-6 py-1.5 text-[11px] bg-stone-50 border border-stone-200/80 rounded-md focus:outline-none focus:ring-1.5 focus:ring-amber-400 focus:border-transparent placeholder-stone-400 transition-all"
                                />
                                {wordSearch && (
                                  <button
                                    onClick={() => setWordSearch('')}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="mt-1">
                                <span className="text-[10px] text-stone-400">
                                  {wordsLoading ? '加载中...' : `${filteredWords.length} 词`}
                                </span>
                              </div>
                            </div>

                            {wordsLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                <span className="ml-1.5 text-[11px] text-stone-400">加载中...</span>
                              </div>
                            ) : filteredWords.length === 0 ? (
                              <div className="py-6 text-center">
                                <BookOpen className="w-5 h-5 text-stone-200 mx-auto mb-1" />
                                <p className="text-[11px] text-stone-400">
                                  {wordSearch ? '未找到匹配的单词' : '暂无单词'}
                                </p>
                              </div>
                            ) : (
                              <div className="max-h-[280px] overflow-y-auto">
                                {filteredWords.map((word) => (
                                  <div key={word.word} className="border-b border-stone-50 last:border-b-0">
                                    <button
                                      onClick={() => setExpandedWord(prev => prev === word.word ? null : word.word)}
                                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-stone-50/80 transition-colors text-left"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] font-semibold text-stone-800">{word.word}</span>
                                          {word.ipa && (
                                            <span className="text-[10px] text-stone-400 ipa-font">
                                              {word.ipa.startsWith('/') ? word.ipa : `/${word.ipa}/`}
                                            </span>
                                          )}
                                          {word.part_of_speech && (
                                            <span className="text-[9px] px-1 py-px bg-stone-100 text-stone-500 rounded font-medium">
                                              {word.part_of_speech}
                                            </span>
                                          )}
                                        </div>
                                        {word.meaning && (
                                          <p className="text-[10px] text-stone-500 mt-0.5 truncate">{word.meaning}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); speakText(word.word, lang) }}
                                          className="p-0.5 text-stone-300 hover:text-amber-500 rounded-full transition-colors"
                                        >
                                          <Volume2 className="w-3 h-3" />
                                        </button>
                                        <motion.div
                                          animate={{ rotate: expandedWord === word.word ? 180 : 0 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <ChevronDown className="w-3 h-3 text-stone-300" />
                                        </motion.div>
                                      </div>
                                    </button>

                                    <AnimatePresence>
                                      {expandedWord === word.word && (
                                        <CompactWordDetail word={word} sourceLang={lang} />
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-0.5 px-0.5">
                      {items.map((record) => (
                        <HistoryItem
                          key={record.file_id}
                          record={record}
                          isRenaming={renamingId === record.file_id}
                          renameValue={renameValue}
                          onRenameStart={handleRenameStart}
                          onRenameConfirm={handleRenameConfirm}
                          onRenameCancel={handleRenameCancel}
                          onRenameChange={setRenameValue}
                          onNavigate={onNavigateToRecord}
                          onMenuOpen={handleMenuOpen}
                          t={t}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-3 py-2 border-t border-stone-200/60 flex-shrink-0">
                <div className="text-[10px] text-stone-300 text-center">
                  {records.length} {records.length === 1 ? 'record' : 'records'}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!expanded && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setExpanded(true)}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-stone-50 hover:bg-stone-100 border border-stone-200/80 border-l-0 text-stone-400 hover:text-stone-600 transition-colors self-start mt-4 rounded-r-lg"
            title={t.historyTitle || '学习记录'}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {menuState.open && (
          <ContextMenu
            x={menuState.x}
            y={menuState.y}
            onRename={() => handleRenameStart(menuState.fileId)}
            onDelete={() => handleDelete(menuState.fileId)}
            onClose={handleMenuClose}
            t={t}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default HistorySidebar
