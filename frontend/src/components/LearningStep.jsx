import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, Brain } from 'lucide-react'

function LearningStep({ learningData, showWordCard, selectedOption, isCorrect, onOptionSelect, onNextWord, onBack, loading, t }) {
  if (!learningData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-lg text-slate-600">{t.loading}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      {/* 返回按钮 */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.backToVocab}
      </motion.button>

      <AnimatePresence mode="wait">
        {!showWordCard ? (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
          >
            <div className="text-center mb-8">
              <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-4xl font-semibold text-slate-900 mb-2"
              >
                {learningData.word}
              </motion.h2>
              {learningData.ipa && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl text-slate-500 ipa-font"
                >
                  /{learningData.ipa}/
                </motion.p>
              )}
            </div>

            <div className="space-y-4">
              {learningData.options.map((option, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOptionSelect(index)}
                  disabled={selectedOption !== null && isCorrect}
                  className={`w-full py-4 px-6 text-left rounded-lg transition-all ${selectedOption === index ? (isCorrect ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800') : 'bg-white border border-slate-200 text-slate-900 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    {selectedOption === index && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </motion.div>
                    )}
                    <span className="text-lg">{option}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="word-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
          >
            <div className="flex items-start justify-between mb-8">
              <div>
                <motion.h2 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-semibold text-slate-900 mb-2"
                >
                  {learningData.word}
                </motion.h2>
                {learningData.ipa && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl text-slate-500 ipa-font"
                  >
                    /{learningData.ipa}/
                  </motion.p>
                )}
              </div>
            </div>

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
                <p className="text-lg text-slate-700 leading-relaxed mb-4">
                  {learningData.enriched_meaning || learningData.correct_meaning}
                </p>
                {learningData.context_meaning && learningData.context_meaning !== learningData.enriched_meaning && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">上下文释义</h4>
                    <p className="text-slate-700">{learningData.context_meaning}</p>
                  </div>
                )}
              </motion.div>

              {learningData.context && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t.context}
                  </h3>
                  <p className="text-lg text-slate-700 leading-relaxed italic">
                    {learningData.context}
                  </p>
                </motion.div>
              )}

              {learningData.variants_detail && learningData.variants_detail.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t.variants}
                  </h3>
                  <div className="space-y-2">
                    {learningData.variants_detail.map((variant, index) => (
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

              {learningData.examples && learningData.examples.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t.examples}
                  </h3>
                  <div className="space-y-4">
                    {learningData.examples.map((example, index) => (
                      <div key={index} className="border-l-4 border-slate-200 pl-4">
                        <p className="text-slate-900 mb-1">{example.sentence}</p>
                        <p className="text-slate-600 text-sm">{example.translation}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {learningData.memory_hint && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t.memoryHint}
                  </h3>
                  <p className="text-lg text-slate-700 leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-100">
                    {learningData.memory_hint}
                  </p>
                </motion.div>
              )}
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onNextWord}
              disabled={loading}
              className="mt-8 w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.loading}
                </>
              ) : (
                <>
                  {t.nextQuestion}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default LearningStep