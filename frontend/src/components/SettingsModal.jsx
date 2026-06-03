import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, Key, Globe, Cpu, Check, Loader2, Gauge, Languages, ChevronLeft, ChevronRight, Plus, Minus, BookOpen } from 'lucide-react'
import { api } from '../utils/api'
import { LangIcon } from './InputStep'

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
}

function SettingsModal({ isOpen, onClose, targetLang, onTargetLangChange, pageSize, onPageSizeChange, t }) {
  const [configs, setConfigs] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rpm, setRpm] = useState(60)
  const [retryInterval, setRetryInterval] = useState(1)
  const [localTargetLang, setLocalTargetLang] = useState(targetLang || 'zh')
  const [localPageSize, setLocalPageSize] = useState(50)

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
        if (prefs.rpm) setRpm(prefs.rpm)
        if (prefs.retry_interval !== undefined) setRetryInterval(prefs.retry_interval)
        if (prefs.target_lang) setLocalTargetLang(prefs.target_lang)
        if (prefs.page_size) setLocalPageSize(prefs.page_size)
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
          api_key: c.api_key || (c.has_key ? `****${c.masked_key}` : ''),
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

      await api.saveUserPreferences({ rpm, retry_interval: retryInterval, target_lang: localTargetLang, page_size: localPageSize })

      if (onTargetLangChange && localTargetLang !== targetLang) {
        onTargetLangChange(localTargetLang)
      }

      if (onPageSizeChange && localPageSize !== pageSize) {
        onPageSizeChange(localPageSize)
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
        className="fixed inset-0 z-50 flex items-start justify-end p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className="bg-[#faf6ed] border border-stone-900 shadow-2xl shadow-stone-900/20 w-[360px] overflow-hidden mt-2"
          style={{ borderRadius: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-900/15">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-px bg-stone-900" />
              <h2 className="font-mono-ui text-[10px] tracking-[0.25em] text-stone-700 uppercase">
                {t.settings || 'Settings'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-stone-900 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
            </div>
          ) : (
            <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh] scrollbar-thin">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-px bg-stone-900/40" />
                    <span className="font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase">
                      {t.apiConfig || 'API Configuration'} · {String(currentIndex + 1).padStart(2, '0')}/{String(configs.length).padStart(2, '0')}
                    </span>
                  </div>
                  {configs.length > 1 && (
                    <button
                      onClick={() => removeConfig(currentIndex)}
                      className="font-mono-ui text-[10px] tracking-[0.15em] text-stone-500 hover:text-red-600 transition-colors uppercase flex items-center gap-1"
                    >
                      <Minus className="w-3 h-3" />
                      {t.remove || 'Remove'}
                    </button>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goPrev}
                      disabled={isFirst}
                      className={`flex-shrink-0 w-7 h-7 flex items-center justify-center transition-all ${
                        isFirst
                          ? 'text-stone-200 cursor-not-allowed'
                          : 'text-stone-500 hover:text-stone-900 hover:bg-stone-900/5'
                      }`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-1 min-w-0 overflow-hidden border border-stone-900/15 bg-transparent">
                      <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                          key={currentIndex}
                          custom={direction}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="p-3.5 space-y-3"
                        >
                          <div>
                            <label className="flex items-center gap-1.5 font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase mb-1.5">
                              <Key className="w-3 h-3" />
                              <span>API Key</span>
                              {current?.has_key && <span className="text-emerald-600 normal-case tracking-normal font-mono-ui text-[10px]">● {t.configured || 'Set'}</span>}
                            </label>
                            <input
                              type="password"
                              value={current?.api_key || ''}
                              onChange={e => updateConfig(currentIndex, 'api_key', e.target.value)}
                              placeholder={current?.masked_key || 'sk-...'}
                              className="w-full px-3 py-2 text-[12px] bg-transparent border border-stone-900/20 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 font-mono-ui transition-colors"
                              style={{ borderRadius: 0 }}
                            />
                            {current?.has_key && !current?.api_key && (
                              <p className="font-mono-ui text-[10px] text-stone-500 mt-1">{t.leaveEmptyKeepKey || 'Leave empty to keep'}</p>
                            )}
                          </div>

                          <div>
                            <label className="flex items-center gap-1.5 font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase mb-1.5">
                              <Globe className="w-3 h-3" />
                              <span>Base URL</span>
                            </label>
                            <input
                              type="text"
                              value={current?.base_url || ''}
                              onChange={e => updateConfig(currentIndex, 'base_url', e.target.value)}
                              placeholder="https://api.siliconflow.cn/v1"
                              className="w-full px-3 py-2 text-[12px] bg-transparent border border-stone-900/20 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 font-mono-ui transition-colors"
                              style={{ borderRadius: 0 }}
                            />
                          </div>

                          <div>
                            <label className="flex items-center gap-1.5 font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase mb-1.5">
                              <Cpu className="w-3 h-3" />
                              <span>Model</span>
                            </label>
                            <input
                              type="text"
                              value={current?.model || ''}
                              onChange={e => updateConfig(currentIndex, 'model', e.target.value)}
                              placeholder="Qwen/Qwen3.6-27B"
                              className="w-full px-3 py-2 text-[12px] bg-transparent border border-stone-900/20 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 font-mono-ui transition-colors"
                              style={{ borderRadius: 0 }}
                            />
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {isLast ? (
                      <button
                        onClick={addConfig}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-stone-900 hover:bg-stone-900/5 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={goNext}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-900/5 transition-all"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
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
                          className={`transition-all duration-200 ${
                            i === currentIndex
                              ? 'w-5 h-px bg-stone-900'
                              : 'w-1.5 h-px bg-stone-300 hover:bg-stone-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-1.5 font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase mb-2">
                  <span className="w-3 h-px bg-stone-900/40" />
                  <Gauge className="w-3 h-3" />
                  <span>{t.retryInterval || 'Retry Interval'}</span>
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display italic text-[12px] text-stone-500">{t.retryIntervalDesc || 'Wait between retries'}</span>
                    <span className="font-mono-ui text-[11px] tabular-nums text-stone-900">{retryInterval.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={20}
                    step={0.1}
                    value={retryInterval}
                    onChange={e => setRetryInterval(Number(e.target.value))}
                    className="w-full appearance-none cursor-pointer bg-stone-900/10"
                    style={{
                      height: '1px',
                      background: `linear-gradient(to right, #1c1917 0%, #1c1917 ${((retryInterval - 0.1) / (20 - 0.1)) * 100}%, rgba(0,0,0,0.1) ${((retryInterval - 0.1) / (20 - 0.1)) * 100}%, rgba(0,0,0,0.1) 100%)`
                    }}
                  />
                  <div className="flex justify-between">
                    <span className="font-mono-ui text-[9px] text-stone-400 tabular-nums">0.1s</span>
                    <span className="font-mono-ui text-[9px] text-stone-400 tabular-nums">20s</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase mb-2">
                  <span className="w-3 h-px bg-stone-900/40" />
                  <BookOpen className="w-3 h-3" />
                  <span>{t.itemsPerPage || 'Items Per Page'}</span>
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display italic text-[12px] text-stone-500">{t.wordsPerPage || 'Words shown per page'}</span>
                    <span className="font-mono-ui text-[11px] tabular-nums text-stone-900">{String(localPageSize).padStart(3, '0')}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={200}
                    step={10}
                    value={localPageSize}
                    onChange={e => setLocalPageSize(Number(e.target.value))}
                    className="w-full appearance-none cursor-pointer"
                    style={{
                      height: '1px',
                      background: `linear-gradient(to right, #1c1917 0%, #1c1917 ${((localPageSize - 10) / (200 - 10)) * 100}%, rgba(0,0,0,0.1) ${((localPageSize - 10) / (200 - 10)) * 100}%, rgba(0,0,0,0.1) 100%)`
                    }}
                  />
                  <div className="flex justify-between">
                    <span className="font-mono-ui text-[9px] text-stone-400 tabular-nums">010</span>
                    <span className="font-mono-ui text-[9px] text-stone-400 tabular-nums">200</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-mono-ui text-[10px] tracking-[0.2em] text-stone-500 uppercase mb-2">
                  <span className="w-3 h-px bg-stone-900/40" />
                  <Languages className="w-3 h-3" />
                  <span>{t.nativeLang || 'Native Language'}</span>
                </label>
                <div className="grid grid-cols-2 gap-0 border border-stone-900/20">
                  {[
                    { value: 'zh', label: '中文' },
                    { value: 'en', label: 'English' },
                  ].map((opt, idx) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLocalTargetLang(opt.value)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[12px] font-medium transition-all duration-200 ${
                        localTargetLang === opt.value
                          ? 'bg-stone-900 text-stone-50'
                          : 'bg-transparent text-stone-600 hover:bg-stone-900/5'
                      } ${idx > 0 ? 'border-l border-stone-900/20' : ''}`}
                    >
                      <LangIcon langCode={opt.value} size="sm" />
                      <span className="font-mono-ui tracking-wider text-[11px] uppercase">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-between px-4 py-3 border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-stone-50 disabled:opacity-50 transition-all group"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center gap-2">
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : saved ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : null}
                  <span className="font-mono-ui text-[10px] tracking-[0.25em] uppercase">
                    {saving ? (t.saving || 'Saving…') : saved ? (t.saved || 'Saved') : (t.save || 'Save')}
                  </span>
                </div>
                <span className="font-display italic text-[13px]">→</span>
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default SettingsModal
