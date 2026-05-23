import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, MoreHorizontal, Pencil, Trash2, MessageSquare, PanelLeftClose, PanelLeftOpen, Library } from 'lucide-react'
import { api } from '../utils/api'

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

const SIDEBAR_COLORS = [
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-sky-500',
  'from-lime-400 to-green-500',
  'from-fuchsia-400 to-pink-500',
]

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

function HistorySidebar({ onNavigateToRecord, t, onOpenWordList, activeWordListLang }) {
  const [expanded, setExpanded] = useState(true)
  const [records, setRecords] = useState([])
  const [menuState, setMenuState] = useState({ open: false, fileId: null, x: 0, y: 0 })
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

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

  const langKeys = Object.keys(grouped)

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
                  <PanelLeftClose className="w-4 h-4" />
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

                {Object.entries(grouped).map(([lang, items], langIdx) => (
                  <div key={lang} className="mb-1">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 mt-1">
                      <span className="text-xs">{LANG_ICONS[lang] || '📝'}</span>
                      <span className="text-[11px] font-medium text-stone-400 tracking-wide">
                        {LANG_LABELS[lang] || lang}
                      </span>
                      <span className="text-[10px] text-stone-300">{items.length}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenWordList && onOpenWordList(lang) }}
                        className={`ml-auto p-1 rounded-md transition-all ${
                          activeWordListLang === lang
                            ? 'bg-gradient-to-br ' + SIDEBAR_COLORS[langIdx % SIDEBAR_COLORS.length] + ' text-white shadow-sm'
                            : 'text-stone-300 hover:text-amber-500 hover:bg-amber-50'
                        }`}
                        title="Word list"
                      >
                        <Library className="w-3.5 h-3.5" />
                      </button>
                    </div>

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-shrink-0 flex flex-col items-center pt-4 pb-2 gap-1 bg-stone-50 border-r border-stone-200/80"
            style={{ width: 48 }}
          >
            <button
              onClick={() => setExpanded(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-200/70 text-stone-400 hover:text-stone-600 transition-colors"
              title={t.historyTitle || '学习记录'}
            >
              <PanelLeftOpen className="w-4.5 h-4.5" />
            </button>

            <div className="w-6 border-t border-stone-200/60 my-1" />

            {langKeys.map((lang, idx) => (
              <button
                key={lang}
                onClick={(e) => { e.stopPropagation(); onOpenWordList && onOpenWordList(lang) }}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                  activeWordListLang === lang
                    ? 'bg-gradient-to-br ' + SIDEBAR_COLORS[idx % SIDEBAR_COLORS.length] + ' text-white shadow-md'
                    : 'hover:bg-stone-200/70 text-stone-400 hover:text-stone-600'
                }`}
                title={`${LANG_LABELS[lang] || lang} - ${t.wordList || '单词总表'}`}
              >
                <Library className="w-4 h-4" />
              </button>
            ))}

            {records.length > 0 && langKeys.length > 0 && (
              <div className="w-6 border-t border-stone-200/60 my-1" />
            )}

            {langKeys.flatMap(lang =>
              grouped[lang].slice(0, 3).map((record) => (
                <button
                  key={record.file_id}
                  onClick={() => onNavigateToRecord(record.file_id, record.source_lang, record.target_lang)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-200/70 text-stone-400 hover:text-stone-600 transition-colors"
                  title={record.title}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              ))
            )}
          </motion.div>
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
