import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, MoreHorizontal, Pencil, Trash2, PanelLeftClose, PanelLeftOpen, Library } from 'lucide-react'
import { api } from '../utils/api'
import { LangIcon, LANGUAGES } from './InputStep'

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

const SIDEBAR_COLORS = [
  'from-cadmium-400 to-orange-500',
  'from-teal-400 to-teal-500',
  'from-cadmium-400 to-indigo-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-sky-500',
  'from-lime-400 to-teal-500',
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
      className="fixed z-[9999] bg-white border border-stone-300 rounded-2xl shadow-impasto-lg shadow-black/8 py-1.5 min-w-[160px] overflow-hidden"
    >
      <button
        onClick={() => { onRename(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-umber-700 hover:bg-canvas-50 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-umber-400" />
        {t.rename || '重命名'}
      </button>
      <div className="mx-2.5 my-0.5 border-t border-canvas-100" />
      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-vermilion-500 hover:bg-vermilion-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {t.delete || '删除'}
      </button>
    </motion.div>
  )
}

function ProgressBadge({ progress }) {
  if (!progress) return <span className="w-[32px] flex-shrink-0" />
  const p1 = progress.phase1
  const p2 = progress.phase2
  const totalCompleted = (p1?.completed || 0) + (p2?.completed || 0)
  const totalUnits = (p1?.total || 0) + (p2?.total || 0)
  if (totalUnits === 0) return <span className="w-[32px] flex-shrink-0" />

  const done = totalCompleted >= totalUnits
  return (
    <span className={`w-[32px] text-right text-[10px] font-light tabular-nums flex-shrink-0 ${done ? 'text-teal-500' : 'text-vermilion-400'}`}>
      {totalCompleted}/{totalUnits}
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
            className="flex-1 text-[13px] px-2 py-1 border border-stone-300 rounded-md focus:outline-none focus:ring-1.5 focus:ring-umber-400 bg-canvas-50 text-umber-800"
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-canvas-200/60 transition-colors mx-2 bg-canvas-50"
      onClick={() => onNavigate(record.file_id, record.source_lang, record.target_lang, record.title)}
    >
      <ProgressBadge progress={record.progress} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-umber-700 truncate leading-snug">
          {record.title}
        </div>
      </div>
      <button
        onClick={e => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          onMenuOpen(record.file_id, rect.right - 160, rect.bottom + 4)
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-stone-200/70 text-umber-400 hover:text-umber-600 transition-all flex-shrink-0"
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
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-canvas-200/60 transition-colors text-left"
    >
      <ProgressBadge progress={record.progress} />
      <span className="text-[13px] text-umber-700 truncate flex-1">{record.title}</span>
      <span className="text-[10px] font-semibold text-umber-400 flex-shrink-0 uppercase">{(record.source_lang || '?').substring(0, 2)}</span>
    </button>
  )
}

function HistorySidebar({ onNavigateToRecord, t, onOpenWordList, activeWordListLang, refreshTrigger }) {
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
  }, [refreshTrigger])

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

  const SIDEBAR_WIDTH = 260

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
              className="h-full overflow-hidden flex flex-col bg-canvas-100 border-r border-stone-300"
              style={{ minWidth: 0 }}
            >
              <div className="px-3 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
                <span className="font-display text-[11px] font-semibold text-umber-700 uppercase tracking-wider">
                  {t.historyTitle || '学习记录'}
                </span>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1 rounded-md hover:bg-stone-200/60 text-umber-400 hover:text-umber-600 transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                {records.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <div className="text-2xl mb-2">📚</div>
                    <div className="text-[13px] text-umber-400">
                      {t.noHistory || '暂无学习记录'}
                    </div>
                  </div>
                )}

                {records.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-1.5 mt-1">
                      <span className="text-[11px] font-medium text-umber-400 tracking-wide">
                        {t.recent || '最近'}
                      </span>
                    </div>
                    <div className="space-y-0.5 px-1">
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
                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] text-umber-400 hover:text-umber-600 transition-colors"
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
                    <div className="mx-4 my-2 border-t border-stone-300" />
                  </div>
                )}

                {Object.entries(grouped).map(([lang, items], langIdx) => (
                  <div key={lang} className="mb-1">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 mt-1">
                      <LangIcon langCode={lang} size="sm" />
                      <span className="text-[11px] font-medium text-umber-400 tracking-wide">
                        {getLangLabel(lang)}
                      </span>
                      <span className="text-[10px] text-stone-300">{items.length}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenWordList && onOpenWordList(lang) }}
                        className={`ml-auto p-1 rounded-md transition-all badge-cadmium ${
                          activeWordListLang === lang
                            ? 'bg-gradient-to-br ' + SIDEBAR_COLORS[langIdx % SIDEBAR_COLORS.length] + ' text-white shadow-impasto-sm'
                            : 'text-stone-300 hover:text-cadmium-500 hover:bg-cadmium-50'
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

              <div className="px-3 py-2 border-t border-stone-300 flex-shrink-0">
                <div className="text-[10px] text-stone-300 text-center">
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
            className="flex-shrink-0 flex flex-col items-center pt-4 pb-2 gap-1 bg-canvas-100 border-r border-stone-300"
            style={{ width: 48 }}
          >
            <button
              onClick={() => setExpanded(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-200/70 text-umber-400 hover:text-umber-600 transition-colors"
              title={t.historyTitle || '学习记录'}
            >
              <PanelLeftOpen className="w-4.5 h-4.5" />
            </button>

            <div className="w-6 border-t border-stone-300 my-1" />

            {langKeys.map((lang, idx) => (
              <button
                key={lang}
                onClick={(e) => { e.stopPropagation(); onOpenWordList && onOpenWordList(lang) }}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all ${
                  activeWordListLang === lang
                    ? 'bg-gradient-to-br ' + SIDEBAR_COLORS[idx % SIDEBAR_COLORS.length] + ' text-white shadow-impasto'
                    : 'bg-canvas-100 text-umber-500 hover:bg-stone-200/70 hover:text-umber-700'
                }`}
                title={`${getLangLabel(lang)} - ${t.wordList || '单词总表'}`}
              >
                {lang.substring(0, 2).toUpperCase()}
              </button>
            ))}

            {records.length > 0 && langKeys.length > 0 && (
              <div className="w-6 border-t border-stone-300 my-1" />
            )}

            {langKeys.flatMap(lang =>
              grouped[lang].slice(0, 3).map((record) => (
                <button
                  key={record.file_id}
                  onClick={() => onNavigateToRecord(record.file_id, record.source_lang, record.target_lang, record.title)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-200/70 text-[10px] font-medium text-umber-400 hover:text-umber-600 transition-colors"
                  title={record.title}
                >
                  {(record.source_lang || '?').substring(0, 2).toUpperCase()}
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
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-umber-800/40 backdrop-blur-sm"
            onClick={handleDeleteCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="bg-white border border-stone-300 rounded-3xl shadow-impasto-xl shadow-black/10 p-6 max-w-sm w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-vermilion-50 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-vermilion-400" />
                </div>
                <div>
                  <h3 className="font-display text-[15px] font-semibold text-umber-800">{t.confirmDelete || '确认删除'}</h3>
                  <p className="text-[13px] text-umber-500 mt-0.5 line-clamp-2">{deleteConfirm.title}</p>
                </div>
              </div>
              <p className="text-[13px] text-umber-500 mb-5 pl-[52px]">{t.deleteCannotUndo || '删除后不可恢复，确定要删除吗？'}</p>
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={handleDeleteCancel}
                  className="btn-secondary px-4 py-2 text-[13px]"
                >
                  {t.cancel || '取消'}
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-[13px] rounded-2xl bg-vermilion-400 hover:bg-vermilion-400 text-white font-semibold transition-colors"
                >
                  {t.confirmDeleteAction || '删除'}
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
