import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, MoreHorizontal, Pencil, Trash2, PanelLeftClose, PanelLeftOpen, Library } from 'lucide-react'
import { api } from '../utils/api'
import { LANGUAGES } from './InputStep'

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

function getLangLabel(code) {
  if (LANG_LABELS[code]) return LANG_LABELS[code]
  const found = LANGUAGES.find(l => l.value === code)
  if (found) return found.native || found.en
  return code
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
      className="fixed z-[9999] bg-[#faf6ed] border border-stone-900 shadow-2xl shadow-stone-900/15 py-1.5 min-w-[160px] overflow-hidden"
    >
      <button
        onClick={() => { onRename(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-stone-700 hover:bg-stone-900/5 transition-colors font-display"
      >
        <Pencil className="w-3.5 h-3.5 text-stone-500" />
        {t.rename || '重命名'}
      </button>
      <div className="mx-2.5 my-0.5 border-t border-stone-900/10" />
      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors font-display"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {t.delete || '删除'}
      </button>
    </motion.div>
  )
}

function ProgressBadge({ progress }) {
  if (!progress) return <span className="w-[40px] flex-shrink-0" />
  const p1 = progress.phase1
  const p2 = progress.phase2
  const totalCompleted = (p1?.completed || 0) + (p2?.completed || 0)
  const totalUnits = (p1?.total || 0) + (p2?.total || 0)
  if (totalUnits === 0) return <span className="w-[40px] flex-shrink-0" />

  const done = totalCompleted >= totalUnits
  return (
    <span className={`w-[40px] text-right font-mono-ui text-[10px] tabular-nums flex-shrink-0 tracking-wider ${done ? 'text-emerald-600' : 'text-stone-500'}`}>
      {String(totalCompleted).padStart(2, '0')}/{String(totalUnits).padStart(2, '0')}
    </span>
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
      <div className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
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
            className="flex-1 font-display text-[15px] px-2 py-1 border border-stone-900 bg-transparent focus:outline-none text-stone-900"
            style={{ borderRadius: 0 }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="group relative flex items-baseline gap-2.5 px-3 py-2 cursor-pointer hover:bg-stone-900/[0.03] transition-colors border-b border-stone-900/8"
      onClick={() => onNavigate(record.file_id, record.source_lang, record.target_lang, record.title)}
    >
      <span className="font-mono-ui text-[10px] text-stone-400 tracking-wider flex-shrink-0 w-4 text-right">
        ·{record.file_id ? record.file_id.slice(-3) : '---'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-display text-[15px] text-stone-900 truncate leading-snug">
          {record.title}
        </div>
      </div>
      <ProgressBadge progress={record.progress} />
      <button
        onClick={e => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          onMenuOpen(record.file_id, rect.right - 160, rect.bottom + 4)
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-900 transition-all flex-shrink-0"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function RecentItem({ record, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(record.file_id, record.source_lang, record.target_lang, record.title)}
      className="w-full flex items-baseline gap-2.5 px-3 py-2 hover:bg-stone-900/[0.03] transition-colors text-left border-b border-stone-900/8"
    >
      <span className="font-mono-ui text-[10px] text-stone-400 tracking-wider flex-shrink-0 w-4 text-right">
        ·{record.file_id ? record.file_id.slice(-3) : '---'}
      </span>
      <span className="font-display text-[15px] text-stone-900 truncate flex-1 leading-snug">{record.title}</span>
      <ProgressBadge progress={record.progress} />
    </button>
  )
}

function HistorySidebar({ onNavigateToRecord, t, onOpenWordList, activeWordListLang }) {
  const [expanded, setExpanded] = useState(true)
  const [records, setRecords] = useState([])
  const [menuState, setMenuState] = useState({ open: false, fileId: null, x: 0, y: 0 })
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [recentExpanded, setRecentExpanded] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, fileId: null, title: '' })
  const scrollContainerRef = useRef(null)

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

  const sortedRecords = [...records].sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))

  const grouped = (() => {
    const g = {}
    for (const record of sortedRecords) {
      const lang = record.source_lang || 'other'
      if (!g[lang]) g[lang] = []
      g[lang].push(record)
    }
    return g
  })()

  const langKeys = Object.keys(grouped)

  const recentRecords = sortedRecords.slice(0, recentExpanded ? Math.max(8, 3 + 5 * Math.ceil((sortedRecords.length - 3) / 5)) : 3)
  const hasMoreRecent = sortedRecords.length > 3

  const handleDelete = async (fileId) => {
    const record = records.find(r => r.file_id === fileId)
    setDeleteConfirm({ open: true, fileId, title: record?.title || '' })
  }

  const handleDeleteConfirm = async () => {
    const fileId = deleteConfirm.fileId
    setDeleteConfirm({ open: false, fileId: null, title: '' })
    try {
      await api.deleteHistory(fileId)
      setRecords(prev => prev.filter(r => r.file_id !== fileId))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ open: false, fileId: null, title: '' })
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

  const SIDEBAR_WIDTH = 280

  return (
    <>
      <div className="flex h-full">
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: SIDEBAR_WIDTH, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full overflow-hidden flex flex-col bg-transparent border-r border-stone-900/10"
              style={{ minWidth: 0 }}
            >
              <div className="px-4 pt-5 pb-2.5 flex items-center justify-between flex-shrink-0">
                <span className="font-mono-ui text-[10px] tracking-[0.25em] text-stone-500 uppercase">
                  {t.historyTitle || '学习记录'}
                </span>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1 text-stone-400 hover:text-stone-900 transition-colors"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mx-4 border-t border-stone-900/15" />

              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                {records.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <div className="font-display italic text-[15px] text-stone-500 leading-relaxed">
                      {t.noHistory || '暂无学习记录'}
                    </div>
                    <div className="mt-3 mx-auto w-8 h-px bg-stone-900/15" />
                  </div>
                )}

                {records.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-2 mt-1">
                      <span className="font-mono-ui text-[10px] tracking-[0.25em] text-stone-500 uppercase">
                        {t.recent || '最近'}
                      </span>
                    </div>
                    <div>
                      {recentRecords.map(record => (
                        <RecentItem
                          key={record.file_id}
                          record={record}
                          onNavigate={onNavigateToRecord}
                        />
                      ))}
                    </div>
                    {hasMoreRecent && (
                      <button
                        onClick={() => {
                          setRecentExpanded(prev => {
                            if (prev && scrollContainerRef.current) {
                              scrollContainerRef.current.scrollTop = 0
                            }
                            return !prev
                          })
                        }}
                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 hover:text-stone-900 transition-colors uppercase"
                      >
                        {recentExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            {t.collapse || '收起'}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            {t.showMore || '显示更多'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {Object.entries(grouped).map(([lang, items], langIdx) => (
                  <div key={lang} className="mb-1">
                    <div className="flex items-center gap-2 px-4 py-2 mt-2">
                      <span className="font-mono-ui text-[10px] tracking-[0.25em] text-stone-500 uppercase">
                        {getLangLabel(lang)}
                      </span>
                      <span className="font-mono-ui text-[10px] text-stone-400">[{items.length}]</span>
                      <span className="flex-1 h-px bg-stone-900/10" />
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenWordList && onOpenWordList(lang) }}
                        className={`p-1 transition-all ${
                          activeWordListLang === lang
                            ? 'text-stone-900'
                            : 'text-stone-400 hover:text-stone-900'
                        }`}
                        title={t.wordList || '单词总表'}
                      >
                        <Library className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
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

              <div className="px-4 py-3 border-t border-stone-900/10 flex-shrink-0">
                <div className="font-mono-ui text-[10px] tracking-[0.2em] text-stone-400 text-center uppercase">
                  {records.length} {t.record || '条记录'}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-shrink-0 flex flex-col items-center pt-5 pb-2 gap-1.5 bg-transparent border-r border-stone-900/10"
            style={{ width: 44 }}
          >
            <button
              onClick={() => setExpanded(true)}
              className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors"
              title={t.historyTitle || '学习记录'}
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
            </button>

            <div className="w-5 border-t border-stone-900/15 my-1" />

            {langKeys.map((lang) => (
              <button
                key={lang}
                onClick={(e) => { e.stopPropagation(); onOpenWordList && onOpenWordList(lang) }}
                className={`w-8 h-8 flex items-center justify-center font-display italic text-[12px] transition-all ${
                  activeWordListLang === lang
                    ? 'text-stone-900 underline underline-offset-4 decoration-stone-900/50'
                    : 'text-stone-400 hover:text-stone-900'
                }`}
                title={`${getLangLabel(lang)} - ${t.wordList || '单词总表'}`}
              >
                {(lang || '?').substring(0, 2).toLowerCase()}
              </button>
            ))}

            {records.length > 0 && langKeys.length > 0 && (
              <div className="w-5 border-t border-stone-900/15 my-1" />
            )}

            {langKeys.flatMap(lang =>
              grouped[lang].slice(0, 3).map((record) => (
                <button
                  key={record.file_id}
                  onClick={() => onNavigateToRecord(record.file_id, record.source_lang, record.target_lang, record.title)}
                  className="w-8 h-8 flex items-center justify-center font-mono-ui text-[10px] text-stone-500 hover:text-stone-900 transition-colors"
                  title={record.title}
                >
                  {(record.file_id || '---').slice(-2)}
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

      <AnimatePresence>
        {deleteConfirm.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-stone-900/30 backdrop-blur-[2px]"
            onClick={handleDeleteCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="bg-[#faf6ed] border border-stone-900 shadow-2xl shadow-stone-900/30 p-6 max-w-sm w-full mx-4"
              style={{ borderRadius: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <Trash2 className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-[18px] text-stone-900 font-medium">{t.confirmDelete || 'Confirm delete'}</h3>
                  <p className="font-mono-ui text-[10px] tracking-[0.15em] text-stone-500 uppercase mt-0.5 truncate">{deleteConfirm.title}</p>
                </div>
              </div>
              <div className="my-4 border-t border-stone-900/10" />
              <p className="font-display italic text-[14px] text-stone-600 leading-relaxed mb-5">{t.deleteCannotUndo || 'This action cannot be undone.'}</p>
              <div className="grid grid-cols-2 gap-0 border border-stone-900/20">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2.5 text-[11px] font-mono-ui tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-900/5 transition-colors border-r border-stone-900/20"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2.5 text-[11px] font-mono-ui tracking-[0.2em] uppercase bg-stone-900 text-stone-50 hover:bg-red-700 transition-colors"
                >
                  {t.confirmDeleteAction || 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default HistorySidebar
