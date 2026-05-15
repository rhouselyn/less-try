import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, Key, Globe, Cpu, Check, Loader2 } from 'lucide-react'

function SettingsModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          setApiKey(data.api_key || '')
          setBaseUrl(data.base_url || '')
          setModel(data.model || '')
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [isOpen])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, base_url: baseUrl, model: model })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Failed to save settings:', e)
    } finally {
      setSaving(false)
    }
  }

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
          className="bg-white rounded-xl shadow-2xl border border-stone-200/80 w-[340px] overflow-hidden mt-2"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-stone-500" />
              <h2 className="text-sm font-semibold text-stone-800">API 设置</h2>
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
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all placeholder:text-stone-300"
                />
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
