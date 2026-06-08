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
  'bg-ochre-400',
  'bg-moss-400',
  'bg-ochre-400',
  'bg-rose-400',
  'bg-violet-400',
  'bg-cyan-400',
  'bg-lime-400',
  'bg-fuchsia-400',
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
      className="fixed z-[9999] bg-cream-50 border border-bone-200 rounded-none shadow-warm-lg shadow-black/8 py-1.5 min-w-[160px] overflow-hidden"
    >
      <button
        onClick={() => { onRename(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink-700 hover:bg-cream-50 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-ink-400" />
        {t.rename || '重命名'}
      </button>
      <div className="mx-2.5 my-0.5 border-t border-cream-100" />
      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ember-500 hover:bg-ember-50 transition-colors"
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
    <span className={`w-[32px] text-right text-[10px] font-light tabular-nums flex-shrink-0 ${done ? 'text-moss-500' : 'text-ember-600'}`}>
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
            className="flex-1 text-[13px] px-2 py-1 border border-bone-300 rounded-none focus:outline-none focus:ring-1.5 focus:ring-ink-400 bg-cream-50 text-ink-800 font-serif"
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="group flex items-center gap-2 px-2.5 py-2 rounded-none cursor-pointer hover:bg-cream-200/60 transition-colors mx-2 bg-cream-50 border-bone-200"
      onClick={() => onNavigate(record.file_id, record.source_lang, record.target_lang, record.title)}
    >
      <ProgressBadge progress={record.progress} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink-700 truncate leading-snug">
          {record.title}
        </div>
      </div>
      <button
        onClick={e => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          onMenuOpen(record.file_id, rect.right - 160, rect.bottom + 4)
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-none hover:bg-bone-200/70 text-ink-400 hover:text-ink-600 transition-all flex-shrink-0"
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
      className="w-full flex items-center gap-2 px-3 py-2 rounded-none hover:bg-cream-200/60 transition-colors text-left"
    >
      <ProgressBadge progress={record.progress} />
      <span className="text-[13px] text-ink-700 truncate flex-1">{record.title}</span>
      <span className="text-[10px] font-semibold text-ink-400 flex-shrink-0 uppercase">{(record.source_lang || '?').substring(0, 2)}</span>
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
              className="h-full overflow-hidden flex flex-col bg-cream-100/50 border-r border-bone-200/60"
              style={{ minWidth: 0 }}
            >
              <div className="px-3 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
                <span className="font-serif text-[11px] font-semibold text-ink-700 uppercase tracking-wider">
                  {t.historyTitle || '学习记录'}
                </span>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1 rounded-none hover:bg-bone-200/60 text-ink-400 hover:text-ink-600 transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                {records.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <div className="text-2xl mb-2">📚</div>
                    <div className="text-[13px] text-ink-400">
                      {t.noHistory || '暂无学习记录'}
                    </div>
                  </div>
                )}

                {records.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-1.5 mt-1">
                      <span className="text-[11px] font-medium text-ink-400 tracking-wide">
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
                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] text-ink-400 hover:text-ink-600 transition-colors"
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
                    <div className="mx-4 my-2 border-t border-bone-200/60" />
                  </div>
                )}

                {Object.entries(grouped).map(([lang, items], langIdx) => (
                  <div key={lang} className="mb-1">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 mt-1">
                      <LangIcon langCode={lang} size="sm" />
                      <span className="text-[11px] font-medium text-ink-400 tracking-wide">
                        {getLangLabel(lang)}
                      </span>
                      <span className="text-[10px] text-bone-300">{items.length}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenWordList && onOpenWordList(lang) }}
                        className={`ml-auto p-1 rounded-none transition-all badge-ochre ${
                          activeWordListLang === lang
                            ? SIDEBAR_COLORS[langIdx % SIDEBAR_COLORS.length] + ' text-white shadow-warm-sm'
                            : 'text-bone-300 hover:text-ochre-500 hover:bg-ochre-50'
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

              <div className="px-3 py-2 border-t border-bone-200/60 flex-shrink-0">
                <div className="text-[10px] text-bone-300 text-center">
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
            className="flex-shrink-0 flex flex-col items-center pt-4 pb-2 gap-1 bg-cream-100/50 border-r border-bone-200/60"
            style={{ width: 48 }}
          >
            <button
              onClick={() => setExpanded(true)}
              className="w-9 h-9 flex items-center justify-center rounded-none hover:bg-bone-200/70 text-ink-400 hover:text-ink-600 transition-colors"
              title={t.historyTitle || '学习记录'}
            >
              <PanelLeftOpen className="w-4.5 h-4.5" />
            </button>

            <div className="w-6 border-t border-bone-200/60 my-1" />

            {langKeys.map((lang, idx) => (
              <button
                key={lang}
                onClick={(e) => { e.stopPropagation(); onOpenWordList && onOpenWordList(lang) }}
                className={`w-9 h-9 flex items-center justify-center rounded-none text-[13px] font-bold transition-all ${
                  activeWordListLang === lang
                    ? SIDEBAR_COLORS[idx % SIDEBAR_COLORS.length] + ' text-white shadow-warm'
                    : 'bg-cream-100 text-ink-500 hover:bg-bone-200/70 hover:text-ink-700'
                }`}
                title={`${getLangLabel(lang)} - ${t.wordList || '单词总表'}`}
              >
                {lang.substring(0, 2).toUpperCase()}
              </button>
            ))}

            {records.length > 0 && langKeys.length > 0 && (
              <div className="w-6 border-t border-bone-200/60 my-1" />
            )}

            {langKeys.flatMap(lang =>
              grouped[lang].slice(0, 3).map((record) => (
                <button
                  key={record.file_id}
                  onClick={() => onNavigateToRecord(record.file_id, record.source_lang, record.target_lang, record.title)}
                  className="w-9 h-9 flex items-center justify-center rounded-none hover:bg-bone-200/70 text-[10px] font-medium text-ink-400 hover:text-ink-600 transition-colors"
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
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-ink-800/40"
            onClick={handleDeleteCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="bg-cream-50 border border-bone-200 rounded-none shadow-warm-xl shadow-black/10 p-6 max-w-sm w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-ember-50 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-ember-500" />
                </div>
                <div>
                  <h3 className="font-serif text-[15px] font-semibold text-ink-800">{t.confirmDelete || '确认删除'}</h3>
                  <p className="text-[13px] text-ink-500 mt-0.5 line-clamp-2">{deleteConfirm.title}</p>
                </div>
              </div>
              <p className="text-[13px] text-ink-500 mb-5 pl-[52px]">{t.deleteCannotUndo || '删除后不可恢复，确定要删除吗？'}</p>
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={handleDeleteCancel}
                  className="btn-secondary px-4 py-2 text-[13px] rounded-none border border-bone-200 text-ink-600 hover:bg-cream-100 transition-colors"
                >
                  {t.cancel || '取消'}
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-[13px] rounded-none bg-ember-400 hover:bg-ember-500 text-white font-semibold transition-colors"
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
