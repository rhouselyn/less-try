import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, Key, Globe, Cpu, Check, Loader2, Gauge, Languages } from 'lucide-react'
import { api } from '../utils/api'

function SettingsModal({ isOpen, onClose, targetLang, onTargetLangChange }) {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [maskedKey, setMaskedKey] = useState('')
  const [rpm, setRpm] = useState(20)
  const [localTargetLang, setLocalTargetLang] = useState(targetLang || 'zh')

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setSaved(false)
      Promise.all([
        fetch('/api/settings').then(res => res.json()),
        api.getAppSettings().catch(() => ({}))
      ]).then(([data, appData]) => {
        setBaseUrl(data.base_url || '')
        setModel(data.model || '')
        setHasKey(data.has_key || false)
        setMaskedKey(data.api_key || '')
        setApiKey('')
        if (appData.rpm) setRpm(appData.rpm)
        if (appData.target_lang) setLocalTargetLang(appData.target_lang)
        setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [isOpen])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const body = { base_url: baseUrl, model: model }
      if (apiKey) {
        body.api_key = apiKey
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      setBaseUrl(data.base_url || '')
      setModel(data.model || '')
      setHasKey(data.has_key || false)
      setMaskedKey(data.api_key || '')
      setApiKey('')

      await api.saveAppSettings({ rpm, target_lang: localTargetLang })

      if (onTargetLangChange && localTargetLang !== targetLang) {
        onTargetLangChange(localTargetLang)
      }

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 800)
    } catch (e) {
      console.error('Failed to save settings:', e)
    } finally {
      setSaving(false)
    }
  }

  const rpmPercent = ((rpm - 5) / (60 - 5)) * 100

  if (!isOpen) return null

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
          className="bg-white rounded-xl shadow-2xl border border-stone-200/80 w-[340px] overflow-hidden mt-2 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-stone-500" />
              <h2 className="text-sm font-semibold text-stone-800">设置</h2>
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
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                  <Key className="w-3 h-3" />
                  API Key
                  {hasKey && <span className="text-[10px] text-green-500 normal-case tracking-normal">● 已配置</span>}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={maskedKey || 'sk-...'}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all placeholder:text-stone-300"
                />
                {hasKey && !apiKey && (
                  <p className="text-[11px] text-stone-400 mt-1">留空则保持当前 Key 不变</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                  <Globe className="w-3 h-3" />
                  Base URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://api.siliconflow.cn/v1"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all placeholder:text-stone-300"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                  <Cpu className="w-3 h-3" />
                  Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="Qwen/Qwen3.6-27B"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all placeholder:text-stone-300"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                  <Gauge className="w-3 h-3" />
                  LLM 速率
                </label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-stone-400">每分钟 LLM 请求次数</span>
                    <span className="text-xs font-semibold text-amber-600">{rpm} RPM</span>
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
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5">
                  <Languages className="w-3 h-3" />
                  母语
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'zh', label: '中文', flag: '🇨🇳' },
                    { value: 'en', label: 'English', flag: '🇬🇧' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLocalTargetLang(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        localTargetLang === opt.value
                          ? 'border-amber-400/80 bg-amber-50 text-amber-700 shadow-[0_0_0_3px_rgba(245,158,11,0.06)]'
                          : 'border-stone-200/80 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-700'
                      }`}
                    >
                      <span className="text-base leading-none">{opt.flag}</span>
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
                className="w-full py-2.5 bg-stone-800 text-white text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {saving ? '保存中...' : saved ? '已保存' : '保存'}
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default SettingsModal
