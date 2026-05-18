import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Loader2, Sparkles, BookOpen } from 'lucide-react'
import WordListPanel from './WordListPanel'
import LanguageConstellation from './LanguageConstellation'

const targetLanguages = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
]

function TargetPill({ label, selected, onClick }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
        selected
          ? 'bg-stone-800 text-white shadow-lg shadow-stone-800/20'
          : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700'
      }`}
    >
      {label}
    </motion.button>
  )
}

function InputStep({ text, setText, sourceLang, setSourceLang, targetLang, setTargetLang, loading, onProcess, t }) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto relative"
    >
      <div className="relative z-10">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200/60 mb-5"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">少邻国 / Lesslingo</span>
          </motion.div>

          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-bold text-stone-800 mb-3 tracking-tight"
          >
            {t.startLearning}
          </motion.h2>

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-base text-stone-500 max-w-lg mx-auto leading-relaxed"
          >
            {t.inputHint}
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="space-y-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">{t.learnLang}</span>
            </div>
            <LanguageConstellation sourceLang={sourceLang} setSourceLang={setSourceLang} />
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200/60 shadow-xl shadow-stone-200/30 p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Languages className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">{t.nativeLang}</span>
              </div>
              <div className="flex gap-2">
                {targetLanguages.map(lang => (
                  <TargetPill
                    key={lang.value}
                    label={lang.label}
                    selected={targetLang === lang.value}
                    onClick={() => setTargetLang(lang.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">{t.inputText}</span>
              </label>
              <div
                className={`relative rounded-2xl p-[2px] transition-all duration-300 ${
                  isFocused
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-gradient-to-r from-stone-200 via-stone-200 to-stone-200'
                }`}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={t.placeholder}
                  className="w-full h-48 px-5 py-4 rounded-[14px] bg-white text-stone-800 placeholder-stone-400 focus:outline-none resize-none text-base leading-relaxed"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={onProcess}
              disabled={loading || !text.trim()}
              className={`w-full py-3.5 font-semibold rounded-2xl flex items-center justify-center gap-2.5 text-base transition-all duration-300 ${
                loading || !text.trim()
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:from-amber-600 hover:to-amber-700'
              }`}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-2.5"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.processing}
                  </motion.span>
                ) : (
                  <motion.span
                    key="ready"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-2.5"
                  >
                    <Sparkles className="w-5 h-5" />
                    {t.generateMaterials}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <WordListPanel sourceLang={sourceLang} targetLang={targetLang} t={t} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default InputStep
