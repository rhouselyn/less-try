import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2, Check, X } from 'lucide-react'
import { api } from '../utils/api'

const LANG_LABELS = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  ja: '日本語'
}

function HistorySidebar({ onNavigateToRecord, t }) {
  const [expanded, setExpanded] = useState(true)
  const [records, setRecords] = useState([])
  const [hoveredId, setHoveredId] = useState(null)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const menuRef = useRef(null)
  const renameInputRef = useRef(null)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
      setMenuOpenId(null)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleRenameStart = (record) => {
    setRenamingId(record.file_id)
    setRenameValue(record.title)
    setMenuOpenId(null)
  }

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

  const handleRenameCancel = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') handleRenameConfirm()
    if (e.key === 'Escape') handleRenameCancel()
  }

  return (
    <div className="flex h-full">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full overflow-hidden border-r border-slate-200 bg-white flex flex-col"
            style={{ minWidth: 0 }}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 truncate">
                {t.historyTitle || '学习记录'}
              </h2>
              <button
                onClick={() => setExpanded(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {Object.keys(grouped).length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  {t.noHistory || '暂无学习记录'}
                </div>
              )}

              {Object.entries(grouped).map(([lang, items]) => (
                <div key={lang}>
                  <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-50 sticky top-0">
                    {LANG_LABELS[lang] || lang}
                  </div>
                  <div className="pb-1">
                    {items.map((record) => (
                      <div
                        key={record.file_id}
                        className="group relative px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                        onMouseEnter={() => setHoveredId(record.file_id)}
                        onMouseLeave={() => {
                          setHoveredId(null)
                          if (menuOpenId === record.file_id) return
                        }}
                        onClick={() => {
                          if (renamingId === record.file_id) return
                          onNavigateToRecord(record.file_id, record.source_lang, record.target_lang)
                        }}
                      >
                        {renamingId === record.file_id ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                              ref={renameInputRef}
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={handleRenameKeyDown}
                              className="flex-1 text-sm px-1.5 py-0.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-black bg-white"
                            />
                            <button
                              onClick={handleRenameConfirm}
                              className="p-0.5 text-green-600 hover:text-green-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleRenameCancel}
                              className="p-0.5 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-slate-800 truncate pr-6">
                              {record.title}
                            </div>
                            <div className="text-xs text-slate-400 truncate mt-0.5">
                              {record.text_preview}
                            </div>
                          </>
                        )}

                        {hoveredId === record.file_id && renamingId !== record.file_id && (
                          <div className="absolute right-2 top-2" ref={menuOpenId === record.file_id ? menuRef : null}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpenId(menuOpenId === record.file_id ? null : record.file_id)
                              }}
                              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                              {menuOpenId === record.file_id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute right-0 top-7 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 min-w-[120px]"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => handleRenameStart(record)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    {t.rename || '重命名'}
                                  </button>
                                  <button
                                    onClick={() => handleDelete(record.file_id)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {t.delete || '删除'}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!expanded && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setExpanded(true)}
          className="flex-shrink-0 p-2 border-r border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors self-start mt-3 rounded-r-lg"
          title={t.historyTitle || '学习记录'}
        >
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  )
}

export default HistorySidebar
