import { motion } from 'framer-motion'
import { Brain } from 'lucide-react'

function SentenceDetail({ sentenceTranslation, t }) {
  const sentence = sentenceTranslation?.sentence
  const translationResult = sentenceTranslation?.translation_result
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
    >
      <div className="flex items-center mb-8">
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-semibold text-slate-900"
        >
          {t.sentDetail}
        </motion.h2>
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.original}
          </h3>
          <p className="text-lg text-slate-900 leading-relaxed">
            {translationResult?.original || sentence}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.translation}
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {translationResult?.tokenized_translation || translationResult?.original || sentence}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {t.grammar}
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {translationResult?.grammar_explanation || t.loading}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default SentenceDetail