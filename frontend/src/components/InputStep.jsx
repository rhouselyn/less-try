import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Loader2, ArrowLeftRight, Sparkles, BookOpen } from 'lucide-react'
import WordListPanel from './WordListPanel'

const sourceLanguages = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'ja', label: '日本語' },
]

const targetLanguages = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

function FloatingOrb({ className, delay = 0 }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
      animate={{
        y: [0, -20, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  )
}

function FloatingDot({ x, y, delay = 0, size = 4 }) {
  return (
    <motion.div
      className="absolute rounded-full bg-amber-400/30 pointer-events-none"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.3, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

function LanguagePill({ label, value, selected, onClick, groupId }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
        selected
          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800'
      }`}
    >
      {selected && (
        <motion.div
          layoutId={groupId}
          className="absolute inset-0 bg-amber-500 rounded-full"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </motion.button>
  )
}

function InputStep({ text, setText, sourceLang, setSourceLang, targetLang, setTargetLang, loading, onProcess, t }) {
  const [isFocused, setIsFocused] = useState(false)

  const handleSwap = () => {
    const temp = sourceLang
    setSourceLang(targetLang)
    setTargetLang(temp)
  }

  const isSwappable = targetLanguages.some(l => l.value === sourceLang) && sourceLanguages.some(l => l.value === targetLang)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto relative"
    >
      <FloatingOrb className="w-72 h-72 bg-amber-300 -top-20 -left-32" delay={0} />
      <FloatingOrb className="w-56 h-56 bg-amber-200 -top-10 -right-24" delay={2} />
      <FloatingOrb className="w-48 h-48 bg-stone-300 top-40 -right-20" delay={4} />

      <FloatingDot x="8%" y="12%" delay={0} size={5} />
      <FloatingDot x="92%" y="8%" delay={0.8} size={4} />
      <FloatingDot x="85%" y="25%" delay={1.6} size={6} />
      <FloatingDot x="5%" y="35%" delay={2.4} size={3} />
      <FloatingDot x="95%" y="55%" delay={1.2} size={5} />
      <FloatingDot x="3%" y="65%" delay={3.0} size={4} />

      <div className="relative z-10">
        <div className="text-center mb-14">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200/60 mb-6"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">少邻国 / Lesslingo</span>
          </motion.div>

          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-5xl font-bold text-stone-800 mb-4 tracking-tight"
          >
            {t.startLearning}
          </motion.h2>

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-lg text-stone-500 max-w-md mx-auto leading-relaxed"
          >
            {t.inputHint}
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200/60 shadow-xl shadow-stone-200/30 p-8 space-y-8"
        >
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">{t.learnLang}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sourceLanguages.map(lang => (
                  <LanguagePill
                    key={lang.value}
                    label={lang.label}
                    value={lang.value}
                    selected={sourceLang === lang.value}
                    onClick={() => setSourceLang(lang.value)}
                    groupId="source-pill"
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSwap}
                disabled={!isSwappable}
                className={`p-2.5 rounded-full border transition-all duration-200 ${
                  isSwappable
                    ? 'border-stone-200 bg-stone-50 text-stone-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600'
                    : 'border-stone-100 bg-stone-50 text-stone-300 cursor-not-allowed'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
              </motion.button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Languages className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-stone-700 tracking-wide uppercase">{t.nativeLang}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {targetLanguages.map(lang => (
                  <LanguagePill
                    key={lang.value}
                    label={lang.label}
                    value={lang.value}
                    selected={targetLang === lang.value}
                    onClick={() => setTargetLang(lang.value)}
                    groupId="target-pill"
                  />
                ))}
              </div>
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
                className="w-full h-56 px-5 py-4 rounded-[14px] bg-white text-stone-800 placeholder-stone-400 focus:outline-none resize-none text-base leading-relaxed"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onProcess}
            disabled={loading || !text.trim()}
            className={`w-full py-4 font-semibold rounded-2xl flex items-center justify-center gap-2.5 text-base transition-all duration-300 ${
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
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <WordListPanel sourceLang={sourceLang} targetLang={targetLang} t={t} />
        </motion.div>
      </div>
    </motion.div>
  )
}

export default InputStep
