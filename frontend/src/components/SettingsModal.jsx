import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, Key, Globe, Cpu, Check, Loader2, Gauge, Languages, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react'
import { api } from '../utils/api'
import { LangIcon } from './InputStep'

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
}

function SettingsModal({ isOpen, onClose, targetLang, onTargetLangChange, t }) {
  const [configs, setConfigs] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rpm, setRpm] = useState(60)
  const [localTargetLang, setLocalTargetLang] = useState(targetLang || 'zh')

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
        if (prefs.target_lang) setLocalTargetLang(prefs.target_lang)
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

      await api.saveUserPreferences({ rpm, target_lang: localTargetLang })

      if (onTargetLangChange && localTargetLang !== targetLang) {
        onTargetLangChange(localTargetLang)
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

  const rpmPercent = ((rpm - 5) / (60 - 5)) * 100

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
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-xl shadow-2xl border border-stone-200/80 w-[340px] overflow-hidden mt-2"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-stone-500" />
              <h2 className="text-xs font-semibold text-stone-800">{t.settings || '设置'}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-stone-300 hover:text-stone-600 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-stone-300" />
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
                    {t.apiConfig || 'API 配置'} {currentIndex + 1}/{configs.length}
                  </span>
                  {configs.length > 1 && (
                    <button
                      onClick={() => removeConfig(currentIndex)}
                      className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-red-500 transition-colors"
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
                          ? 'text-stone-200 cursor-not-allowed'
                          : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100 active:scale-90'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex-1 min-w-0 overflow-hidden rounded-lg border border-stone-200/80 bg-stone-50/50">
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
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                              <Key className="w-3 h-3" />
                              API Key
                              {current?.has_key && <span className="text-[10px] text-green-500 normal-case tracking-normal">● {t.configured || '已配置'}</span>}
                            </label>
                            <input
                              type="password"
                              value={current?.api_key || ''}
                              onChange={e => updateConfig(currentIndex, 'api_key', e.target.value)}
                              placeholder={current?.masked_key || 'sk-...'}
                              className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all placeholder:text-stone-300"
                            />
                            {current?.has_key && !current?.api_key && (
                              <p className="text-[11px] text-stone-400 mt-1">{t.leaveEmptyKeepKey || '留空则保持当前 Key 不变'}</p>
                            )}
                          </div>

                          <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                              <Globe className="w-3 h-3" />
                              Base URL
                            </label>
                            <input
                              type="text"
                              value={current?.base_url || ''}
                              onChange={e => updateConfig(currentIndex, 'base_url', e.target.value)}
                              placeholder="https://api.siliconflow.cn/v1"
                              className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all placeholder:text-stone-300"
                            />
                          </div>

                          <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                              <Cpu className="w-3 h-3" />
                              Model
                            </label>
                            <input
                              type="text"
                              value={current?.model || ''}
                              onChange={e => updateConfig(currentIndex, 'model', e.target.value)}
                              placeholder="Qwen/Qwen3.6-27B"
                              className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all placeholder:text-stone-300"
                            />
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {isLast ? (
                      <button
                        onClick={addConfig}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={goNext}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all active:scale-90"
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
                              ? 'w-4 h-1.5 bg-amber-400'
                              : 'w-1.5 h-1.5 bg-stone-300 hover:bg-stone-400'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                  <Gauge className="w-3 h-3" />
                  {t.llmRate || 'LLM 速率'}
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">{t.llmRequestsPerMinute || '每分钟 LLM 请求次数'}</span>
                    <span className="text-[11px] font-semibold text-amber-600">{rpm} RPM</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={5}
                      max={60}
                      value={rpm}
                      onChange={e => setRpm(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-stone-100"
                      style={{
                        background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${rpmPercent}%, #f5f5f4 ${rpmPercent}%, #f5f5f4 100%)`
                      }}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-stone-300">5</span>
                      <span className="text-[10px] text-stone-300">60</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                  <Languages className="w-3 h-3" />
                  {t.nativeLang || '母语'}
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'zh', label: '中文' },
                    { value: 'en', label: 'English' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLocalTargetLang(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
                        localTargetLang === opt.value
                          ? 'border-amber-400/80 bg-amber-50 text-amber-700 shadow-[0_0_0_3px_rgba(245,158,11,0.06)]'
                          : 'border-stone-200/80 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-700'
                      }`}
                    >
                      <LangIcon langCode={opt.value} size="sm" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-stone-800 text-white text-xs font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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
