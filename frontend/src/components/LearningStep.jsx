import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, ChevronRight, Brain, BookOpen, Volume2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { speakText } from '../utils/speech'

function LearningStep({ learningData, showWordCard, selectedOption, isCorrect, onOptionSelect, onNextWord, onBack, onOpenVocabList, loading, t, sourceLang, skipListening, reviewMode, reviewIndex, wrongItemsCount }) {
  const speakTimerRef = useRef(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [learningData?.word])

  useEffect(() => {
    if (speakTimerRef.current) {
      clearTimeout(speakTimerRef.current)
      speakTimerRef.current = null
    }
    if (learningData?.word && !skipListening) {
      speakTimerRef.current = setTimeout(() => {
        speakText(learningData.word, sourceLang)
        speakTimerRef.current = null
      }, 300)
    }
    return () => {
      if (speakTimerRef.current) {
        clearTimeout(speakTimerRef.current)
        speakTimerRef.current = null
      }
    }
  }, [learningData?.word, sourceLang, skipListening])

  if (!learningData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-ink-400" />
          <p className="text-lg text-ink-600">{t.loading}</p>
        </div>
      </motion.div>
    )
  }

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((learningData.step_in_unit ?? 0) + 1)
  const listeningCountInUnit = learningData.listening_count_in_unit ?? 0
  const rawTotalItemsInUnit = learningData.total_items_in_unit ?? learningData.word_count_in_unit ?? learningData.unit_end_index ?? 0
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (skipListening ? rawTotalItemsInUnit - listeningCountInUnit : rawTotalItemsInUnit)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onBack}
            className="flex items-center gap-2 btn-ghost"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          {totalItemsInUnit > 0 && (
            <span className="text-sm text-ink-500 font-medium">
              {(t.stepProgress || '第 {0} / {1} 题').replace('{0}', stepInUnit).replace('{1}', totalItemsInUnit)}
            </span>
          )}
          {onOpenVocabList && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={onOpenVocabList}
              className="flex items-center gap-2 btn-ghost"
            >
              <BookOpen className="w-4 h-4" />
              {t.vocabList || '单词表'}
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!showWordCard ? (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-cream-50 border border-bone-200 rounded-3xl p-8 shadow-warm-sm"
          >
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-semibold font-display text-ink-700"
                >
                  {learningData.word}
                </motion.h2>
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); speakText(learningData.word, sourceLang) }}
                  className="p-2 text-ochre-500 hover:text-ochre-500 hover:bg-ochre-50 rounded-full transition-colors"
                >
                  <Volume2 className="w-6 h-6" />
                </motion.button>
              </div>
              {learningData.ipa && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl text-ink-400 ipa-font"
                >
                  {learningData.ipa.startsWith('/') ? learningData.ipa : `/${learningData.ipa}/`}
                </motion.p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                  className={`w-full py-3 px-4 text-left rounded-lg transition-all ${selectedOption === index ? (isCorrect ? 'bg-moss-50 border border-moss-400 text-moss-600' : 'bg-ember-50 border border-ember-400 text-ember-500') : 'border-bone-200 bg-cream-50 text-ink-800 hover:border-ochre-300'}`}
                >
                  <div className="flex items-center gap-3">
                    {selectedOption === index && isCorrect && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-moss-600" />
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
            className="bg-cream-50 border border-bone-200 rounded-3xl p-8 shadow-warm-sm"
          >
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-4xl font-semibold font-display text-ink-700"
                  >
                    {learningData.word}
                  </motion.h2>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); speakText(learningData.word, sourceLang) }}
                    className="p-2 text-ochre-500 hover:text-ochre-500 hover:bg-ochre-50 rounded-full transition-colors"
                  >
                    <Volume2 className="w-6 h-6" />
                  </motion.button>
                </div>
                {learningData.ipa && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl text-ink-400 ipa-font"
                  >
                    {learningData.ipa.startsWith('/') ? learningData.ipa : `/${learningData.ipa}/`}
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
                <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  {t.definition}
                </h3>
                <p className="text-lg text-ink-600 leading-relaxed">
                  {learningData.enriched_meaning || learningData.correct_meaning}
                </p>
              </motion.div>

              {learningData.context && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-3">
                    {t.context}
                  </h3>
                  <div className="flex items-start gap-2">
                    <p className="text-lg text-ink-600 leading-relaxed italic flex-1">
                      {learningData.context}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); speakText(learningData.context, sourceLang) }}
                      className="p-1.5 text-ochre-500 hover:text-ochre-500 hover:bg-ochre-50 rounded-full transition-colors shrink-0 mt-1"
                    >
                      <Volume2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {(learningData.meaning || learningData.context_meaning) && (learningData.meaning || learningData.context_meaning) !== learningData.enriched_meaning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-ochre-50 p-4 rounded-lg border border-ochre-200"
                >
                  <h4 className="text-sm font-medium text-ochre-500 mb-2">{t.contextMeaning || '上下文释义'}</h4>
                  <p className="text-ink-600">{learningData.meaning || learningData.context_meaning}</p>
                </motion.div>
              )}

              {learningData.variants_detail && learningData.variants_detail.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-3">
                    {t.variants}
                  </h3>
                  <div className="space-y-2">
                    {learningData.variants_detail.map((variant, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-cream-100 text-ink-700 rounded text-sm font-medium">
                          {variant.type}
                        </span>
                        <span className="text-ink-700">{variant.form}</span>
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
                  <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-3">
                    {t.examples}
                  </h3>
                  <div className="space-y-4">
                    {learningData.examples.map((example, index) => (
                      <div key={index} className="border-l-4 border-bone-300 pl-4">
                        <div className="flex items-start gap-2">
                          <p className="text-ink-800 mb-1 flex-1">{example.sentence}</p>
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); speakText(example.sentence, sourceLang) }}
                            className="p-1 text-ochre-500 hover:text-ochre-500 hover:bg-ochre-50 rounded-full transition-colors shrink-0"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                        <p className="text-ink-600 text-sm">{example.translation}</p>
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
                  <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-3">
                    {t.memoryHint}
                  </h3>
                  <p className="text-lg text-ink-600 leading-relaxed bg-ochre-50 p-4 rounded-lg border border-ochre-200">
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
              className="mt-8 w-full py-4 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
