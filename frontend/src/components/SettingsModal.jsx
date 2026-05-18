import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

function SettingsModal({ isOpen, onClose, targetLang, onTargetLangChange, rpm, onRpmChange }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative w-full max-w-md mx-4 bg-white rounded-2xl border border-stone-200/80 shadow-2xl shadow-stone-900/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <h2 className="text-base font-semibold text-stone-800">设置</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div>
                <label className="block text-[11px] font-medium text-stone-500 mb-1.5 uppercase tracking-wider">
                  LLM 速率 (RPM)
                </label>
                <p className="text-xs text-stone-400 mb-3">
                  每分钟请求次数，控制生成速度
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={rpm}
                    onChange={(e) => onRpmChange(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-stone-100 rounded-full appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-sm font-semibold text-amber-600 min-w-[2.5rem] text-right tabular-nums">
                    {rpm}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-stone-300">1</span>
                  <span className="text-[10px] text-stone-300">60</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-500 mb-1.5 uppercase tracking-wider">
                  母语 / Native Language
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'zh', label: '中文', flag: '🇨🇳' },
                    { value: 'en', label: 'English', flag: '🇬🇧' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onTargetLangChange(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        targetLang === opt.value
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SettingsModal
