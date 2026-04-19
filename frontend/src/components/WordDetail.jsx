import { useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2, Brain } from 'lucide-react'

function WordDetail({ word, t, onStudyWord }) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayAudio = () => {
    setIsPlaying(true)
    setTimeout(() => setIsPlaying(false), 1000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
    >
      <div className="flex items-start justify-between mb-8">
        <div>
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl font-semibold text-slate-900 mb-2"
          >
            {word.word}
          </motion.h2>
          <div className="flex items-center gap-3">
            {word.ipa && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-slate-500 ipa-font"
              >
                /{word.ipa}/
              </motion.p>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayAudio}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            >
              <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
            </motion.button>
          </div>
        </div>
        {word.morphology && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium"
          >
            {word.morphology}
          </motion.span>
        )}
      </div>

      {/* 学习按钮 */}
      {word.options && word.options.length > 0 && onStudyWord && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onStudyWord(word)}
            className="w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Brain className="w-5 h-5" />
            {t.studyThisWord}
          </motion.button>
        </motion.div>
      )}

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {t.definition}
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {word.meaning || word.context_meaning}
          </p>
        </motion.div>

        {word.variants_detail && word.variants_detail.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.variants}
            </h3>
            <div className="space-y-2">
              {word.variants_detail.map((variant, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm font-medium">
                    {variant.type}
                  </span>
                  <span className="text-slate-700">{variant.form}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {word.examples && word.examples.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.examples}
            </h3>
            <div className="space-y-4">
              {word.examples.map((example, index) => (
                <div key={index} className="border-l-4 border-slate-200 pl-4">
                  <p className="text-slate-900 mb-1">{example.sentence}</p>
                  <p className="text-slate-600 text-sm">{example.translation}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {word.memory_hint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.memoryHint}
            </h3>
            <p className="text-lg text-slate-700 leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-100">
              {word.memory_hint}
            </p>
          </motion.div>
        )}

        {word.context_sentences && word.context_sentences.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
            >
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t.originalSent}
                </h3>
                <div className="space-y-4">
                    {word.context_sentences.map((sentenceObj, index) => {
                        let sentence = typeof sentenceObj === 'string' ? sentenceObj : sentenceObj.sentence;
                        let translation = null;
                        if (typeof sentenceObj === 'object' && sentenceObj.translation) {
                            translation = sentenceObj.translation;
                        } else if (word.context_translations && word.context_translations[index]) {
                            translation = word.context_translations[index];
                        }
                        return (
                            <div key={index} className="border-l-4 border-slate-200 pl-4 py-2">
                                <p className="text-slate-900 mb-2 text-lg italic font-serif">{sentence}</p>
                                {translation && (
                                    <p className="text-slate-600 text-sm font-medium">{translation}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default WordDetail