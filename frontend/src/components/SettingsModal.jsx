import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, Key, Globe, Cpu, Check, Loader2, Gauge, Languages, ChevronLeft, ChevronRight, ChevronDown, Plus, Minus, BookOpen, Palette } from 'lucide-react'
import { api } from '../utils/api'
import { LangIcon, LANGUAGES } from './InputStep'

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
}

function NativeLangSelector({ value, onChange, recentLangs = [] }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedLang = LANGUAGES.find(l => l.value === value)
  const filtered = LANGUAGES.filter(l => {
    if (!search) return true
    const s = search.toLowerCase()
    return l.native.toLowerCase().includes(s) || l.en.toLowerCase().includes(s) || l.zh.includes(search) || l.value.toLowerCase().includes(s)
  })

  const recentFiltered = recentLangs
    .filter(code => code !== value)
    .map(code => LANGUAGES.find(l => l.value === code))
    .filter(Boolean)
    .filter(l => {
      if (!search) return true
      const s = search.toLowerCase()
      return l.native.toLowerCase().includes(s) || l.en.toLowerCase().includes(s) || l.zh.includes(search)
    })

  // Group by family, show most common first
  const commonLangs = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt', 'it', 'ar', 'hi', 'th', 'vi', 'id']
  const commonFiltered = filtered.filter(l => commonLangs.includes(l.value))
  const otherFiltered = filtered.filter(l => !commonLangs.includes(l.value))

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border-[var(--border-width)] border-[var(--border-color)] bg-[var(--color-card)] hover:bg-[var(--color-bg)] transition-colors text-sm shadow-[var(--shadow-sm)]"
      >
        <LangIcon langCode={value} size="sm" />
        <span className="text-[var(--color-dark)] flex-1 text-left">{selectedLang?.native || value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--color-card)] rounded-[var(--radius-sm)] border-[var(--border-width)] border-[var(--border-color)] shadow-[var(--shadow-lg)] overflow-hidden">
          <div className="p-2 border-b-[var(--border-width)] border-[var(--border-color)]">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1.5 rounded-lg bg-[var(--color-card)] border-[var(--border-width)] border-[var(--border-color)] text-xs text-[var(--color-dark)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-dark)]"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {recentFiltered.length > 0 && (
              <>
                <div className="px-3 py-1 text-[10px] text-[var(--color-muted)] font-black uppercase">Recent</div>
                {recentFiltered.map(l => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => { onChange(l.value); setOpen(false); setSearch('') }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      value === l.value ? 'bg-[var(--color-highlight)] text-[var(--color-accent)]' : 'text-[var(--color-dark)] hover:bg-[var(--color-warning)]/20'
                    }`}
                  >
                    <LangIcon langCode={l.value} size="sm" />
                    <span>{l.native}</span>
                  </button>
                ))}
              </>
            )}
            {commonFiltered.length > 0 && (
              <>
                <div className="px-3 py-1 text-[10px] text-[var(--color-muted)] font-black uppercase">Common</div>
                {commonFiltered.map(l => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => { onChange(l.value); setOpen(false); setSearch('') }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      value === l.value ? 'bg-[var(--color-highlight)] text-[var(--color-accent)]' : 'text-[var(--color-dark)] hover:bg-[var(--color-warning)]/20'
                    }`}
                  >
                    <LangIcon langCode={l.value} size="sm" />
                    <span>{l.native}</span>
                  </button>
                ))}
              </>
            )}
            {otherFiltered.length > 0 && (
              <>
                <div className="px-3 py-1 text-[10px] text-[var(--color-muted)] font-black uppercase border-t-[var(--border-width)] border-[var(--border-color)]">All Languages</div>
                {otherFiltered.map(l => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => { onChange(l.value); setOpen(false); setSearch('') }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                      value === l.value ? 'bg-[var(--color-highlight)] text-[var(--color-accent)]' : 'text-[var(--color-dark)] hover:bg-[var(--color-warning)]/20'
                    }`}
                  >
                    <LangIcon langCode={l.value} size="sm" />
                    <span>{l.native}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsModal({ isOpen, onClose, uiLang, onUiLangChange, pageSize, onPageSizeChange, t, recentLangs, onRecentLangsChange, uiTheme = 'cel', onUiThemeChange }) {
  const [configs, setConfigs] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [retryInterval, setRetryInterval] = useState(1)
  const [localUiLang, setLocalUiLang] = useState(uiLang || 'zh')
  const [localPageSize, setLocalPageSize] = useState(50)
  const [localUiTheme, setLocalUiTheme] = useState(uiTheme)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setSaved(false)
      Promise.all([
        fetch('/api/settings').then(res => res.json()),
        api.getUserPreferences().catch(() => ({}))
      ]).then(([data, prefs]) => {
        const loaded = (data.configs && data.configs.length > 0)
          ? data.configs.map(c => ({
              api_key: '',
              base_url: c.base_url || '',
              model: c.model || '',
              has_key: c.has_key || false,
              masked_key: c.api_key || '',
            }))
          : [{ api_key: '', base_url: '', model: '', has_key: false, masked_key: '' }]
        setConfigs(loaded)
        setCurrentIndex(data.active_index || 0)
        if (prefs.retry_interval !== undefined) setRetryInterval(prefs.retry_interval)
        if (prefs.ui_lang) setLocalUiLang(prefs.ui_lang)
        else if (prefs.target_lang) setLocalUiLang(prefs.target_lang)
        if (prefs.page_size) setLocalPageSize(prefs.page_size)
        if (prefs.ui_theme) setLocalUiTheme(prefs.ui_theme)
        setLoading(false)
      }).catch(() => {
        setConfigs([{ api_key: '', base_url: '', model: '', has_key: false, masked_key: '' }])
        setLoading(false)
      })
    }
  }, [isOpen])

  const updateConfig = useCallback((index, field, value) => {
    setConfigs(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }, [])

  const goNext = useCallback(() => {
    if (currentIndex < configs.length - 1) {
      setDirection(1)
      setCurrentIndex(i => i + 1)
    }
  }, [currentIndex, configs.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex(i => i - 1)
    }
  }, [currentIndex])

  const addConfig = useCallback(() => {
    const current = configs[configs.length - 1]
    const newConfig = {
      api_key: '',
      base_url: current?.base_url || '',
      model: current?.model || '',
      has_key: false,
      masked_key: '',
    }
    setDirection(1)
    setConfigs(prev => [...prev, newConfig])
    setCurrentIndex(configs.length)
  }, [configs])

  const removeConfig = useCallback((index) => {
    if (configs.length <= 1) return
    setConfigs(prev => {
      const next = prev.filter((_, i) => i !== index)
      return next
    })
    setCurrentIndex(prev => {
      if (prev >= configs.length - 1) return Math.max(0, configs.length - 2)
      if (prev > index) return prev - 1
      return Math.min(prev, configs.length - 2)
    })
    setDirection(-1)
  }, [configs.length])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const payload = {
        configs: configs.map(c => ({
          api_key: c.api_key || '',
          base_url: c.base_url,
          model: c.model,
        })),
        active_index: currentIndex,
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      const loaded = (data.configs && data.configs.length > 0)
        ? data.configs.map(c => ({
            api_key: '',
            base_url: c.base_url || '',
            model: c.model || '',
            has_key: c.has_key || false,
            masked_key: c.api_key || '',
          }))
        : configs
      setConfigs(loaded)
      setCurrentIndex(data.active_index ?? currentIndex)

      const updatedRecentLangs = [localUiLang, ...recentLangs.filter(code => code !== localUiLang)].slice(0, 5)
      await api.saveUserPreferences({ retry_interval: retryInterval, target_lang: localUiLang, ui_lang: localUiLang, page_size: localPageSize, recent_languages: updatedRecentLangs, ui_theme: localUiTheme })

      if (onRecentLangsChange) {
        onRecentLangsChange(updatedRecentLangs)
      }

      if (onUiLangChange && localUiLang !== uiLang) {
        onUiLangChange(localUiLang)
      }

      if (onPageSizeChange && localPageSize !== pageSize) {
        onPageSizeChange(localPageSize)
      }

      if (onUiThemeChange && localUiTheme !== uiTheme) {
        onUiThemeChange(localUiTheme)
      }

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 250)
    } catch (e) {
      console.error('Failed to save settings:', e)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const current = configs[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === configs.length - 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-end p-6 bg-[var(--color-overlay)] backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="bg-[var(--color-card)] border-[var(--border-width)] border-[var(--border-color)] rounded-[var(--radius-md)] shadow-[var(--shadow-xl)] w-[340px] overflow-hidden mt-2"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b-[var(--border-width)] border-[var(--border-color)]">
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-[var(--color-muted-dark)]" />
              <h2 className="font-display text-xs font-black uppercase text-[var(--color-dark)]">{t.settings || '设置'}</h2>
            </div>
            <button
              onClick={onClose}
              className="btn-ghost p-1 text-[var(--color-muted)] hover:text-[var(--color-dark)] rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-muted)]" />
            </div>
          ) : (
            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="label-warm text-[10px] font-black uppercase text-[var(--color-muted)] tracking-widest">
                    {t.apiConfig || 'API 配置'} {currentIndex + 1}/{configs.length}
                  </span>
                  {configs.length > 1 && (
                    <button
                      onClick={() => removeConfig(currentIndex)}
                      className="flex items-center gap-1 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-pink)] transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                      {t.remove || 'Remove'}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goPrev}
                      disabled={isFirst}
                      className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                        isFirst
                          ? 'text-[var(--color-muted)] cursor-not-allowed opacity-30'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-dark)] hover:bg-[var(--color-bg)] active:scale-90'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex-1 min-w-0 overflow-hidden rounded-[var(--radius-sm)] border-[var(--border-width)] border-[var(--border-color)] bg-[var(--color-card)]">
                      <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                          key={currentIndex}
                          custom={direction}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="p-3 space-y-3"
                        >
                          <div>
                            <label className="label-warm flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--color-muted)] tracking-widest mb-1.5">
                              <Key className="w-3 h-3" />
                              API Key
                              {current?.has_key && <span className="text-[10px] text-[var(--color-success)] normal-case tracking-normal">● {t.configured || '已配置'}</span>}
                            </label>
                            <input
                              type="password"
                              value={current?.api_key || ''}
                              onChange={e => updateConfig(currentIndex, 'api_key', e.target.value)}
                              placeholder={current?.masked_key || 'sk-...'}
                              className="input-warm w-full px-3 py-2 text-xs bg-[var(--color-card)] border-[var(--border-width)] border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-dark)] focus:border-[var(--border-color)] transition-all placeholder:text-[var(--color-muted)]"
                            />
                            {current?.has_key && !current?.api_key && (
                              <p className="text-[11px] text-[var(--color-muted)] mt-1">{t.leaveEmptyKeepKey || '留空则保持当前 Key 不变'}</p>
                            )}
                          </div>

                          <div>
                            <label className="label-warm flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--color-muted)] tracking-widest mb-1.5">
                              <Globe className="w-3 h-3" />
                              Base URL
                            </label>
                            <input
                              type="text"
                              value={current?.base_url || ''}
                              onChange={e => updateConfig(currentIndex, 'base_url', e.target.value)}
                              placeholder="https://api.siliconflow.cn/v1"
                              className="input-warm w-full px-3 py-2 text-xs bg-[var(--color-card)] border-[var(--border-width)] border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-dark)] focus:border-[var(--border-color)] transition-all placeholder:text-[var(--color-muted)]"
                            />
                          </div>

                          <div>
                            <label className="label-warm flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--color-muted)] tracking-widest mb-1.5">
                              <Cpu className="w-3 h-3" />
                              Model
                            </label>
                            <input
                              type="text"
                              value={current?.model || ''}
                              onChange={e => updateConfig(currentIndex, 'model', e.target.value)}
                              placeholder="Qwen/Qwen3.6-27B"
                              className="input-warm w-full px-3 py-2 text-xs bg-[var(--color-card)] border-[var(--border-width)] border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-dark)] focus:border-[var(--border-color)] transition-all placeholder:text-[var(--color-muted)]"
                            />
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {isLast ? (
                      <button
                        onClick={addConfig}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-highlight)] transition-all active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={goNext}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-dark)] hover:bg-[var(--color-bg)] transition-all active:scale-90"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {configs.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mt-2.5">
                      {configs.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setDirection(i > currentIndex ? 1 : -1)
                            setCurrentIndex(i)
                          }}
                          className={`rounded-full transition-all duration-200 ${
                            i === currentIndex
                              ? 'w-4 h-1.5 bg-[var(--color-accent)]'
                              : 'w-1.5 h-1.5 bg-[var(--color-muted)] hover:bg-[var(--color-dark)]'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <label className="label-warm flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--color-muted)] tracking-widest mb-1.5">
                  <Gauge className="w-3 h-3" />
                  {t.retryInterval || '请求间隔'}
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--color-muted)]">{t.retryIntervalDesc || '每次API请求之间的等待时间'}</span>
                    <span className="text-[11px] font-black uppercase text-[var(--color-accent)]">{retryInterval.toFixed(1)}s</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={0.1}
                      max={20}
                      step={0.1}
                      value={retryInterval}
                      onChange={e => setRetryInterval(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg)]"
                      style={{
                        background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${((retryInterval - 0.1) / (20 - 0.1)) * 100}%, var(--color-bg) ${((retryInterval - 0.1) / (20 - 0.1)) * 100}%, var(--color-bg) 100%)`
                      }}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[var(--color-muted)]">0.1s</span>
                      <span className="text-[10px] text-[var(--color-muted)]">20s</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="label-warm flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--color-muted)] tracking-widest mb-1.5">
                  <BookOpen className="w-3 h-3" />
                  {t.itemsPerPage || '每页数量'}
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--color-muted)]">{t.wordsPerPage || '每页显示单词数'}</span>
                    <span className="text-[11px] font-black uppercase text-[var(--color-accent)]">{localPageSize}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={10}
                      max={200}
                      step={10}
                      value={localPageSize}
                      onChange={e => setLocalPageSize(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg)]"
                      style={{
                        background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${((localPageSize - 10) / (200 - 10)) * 100}%, var(--color-bg) ${((localPageSize - 10) / (200 - 10)) * 100}%, var(--color-bg) 100%)`
                      }}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[var(--color-muted)]">10</span>
                      <span className="text-[10px] text-[var(--color-muted)]">200</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="label-warm flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--color-muted)] tracking-widest mb-1.5">
                  <Languages className="w-3 h-3" />
                  {t.nativeLang || '母语'}
                </label>
                <NativeLangSelector value={localUiLang} onChange={setLocalUiLang} recentLangs={recentLangs} />
              </div>

              <div>
                <label className="label-warm flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--color-muted)] tracking-widest mb-2">
                  <Palette className="w-3 h-3" />
                  {t.uiTheme || '界面风格'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocalUiTheme('cel')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-[var(--radius-sm)] border-[var(--border-width)] transition-all ${
                      localUiTheme === 'cel'
                        ? 'border-[var(--color-accent)] bg-[var(--color-highlight)] shadow-[var(--shadow-sm)]'
                        : 'border-[var(--border-color)] bg-[var(--color-card)] hover:border-[var(--border-color-muted)]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg border-[3px] border-[#1a1a2e] bg-[#f0e6d3] shadow-[2px_2px_0_#1a1a2e] flex items-center justify-center">
                      <div className="w-3 h-3 rounded-md bg-[#e63946] border-[2px] border-[#1a1a2e]"></div>
                    </div>
                    <span className={`text-[10px] font-black uppercase ${localUiTheme === 'cel' ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                      {t.celTheme || '赛璐璐'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalUiTheme('classic')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-[var(--radius-sm)] border-[var(--border-width)] transition-all ${
                      localUiTheme === 'classic'
                        ? 'border-[var(--color-accent)] bg-[var(--color-highlight)] shadow-[var(--shadow-sm)]'
                        : 'border-[var(--border-color)] bg-[var(--color-card)] hover:border-[var(--border-color-muted)]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-sm border-2 border-[#C9BB9E] bg-[#F5ECD7] shadow-[2px_2px_0px_rgba(58,46,28,0.12)] flex items-center justify-center">
                      <div className="w-3 h-3 rounded-sm bg-[#C08A3A] border-2 border-[#C9BB9E]"></div>
                    </div>
                    <span className={`text-[10px] font-black uppercase ${localUiTheme === 'classic' ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                      {t.classicTheme || '古典'}
                    </span>
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full py-2.5 bg-[var(--color-dark)] text-white text-xs font-black uppercase rounded-[var(--radius-sm)] hover:bg-[var(--color-dark)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 border-[var(--border-width)] border-[var(--border-color)] shadow-[var(--shadow)]"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {saving ? (t.saving || '保存中...') : saved ? (t.saved || '已保存') : (t.save || '保存')}
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default SettingsModal
