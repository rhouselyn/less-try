import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Volume2, Headphones, SkipForward, Turtle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { speakText } from '../utils/speech'

function ListeningQuizStep({ quizData, onNextQuestion, onBack, loading, t, onOpenVocabList, sourceLang, onAnswer, skipListening, onSkipListeningChange, reviewMode, reviewIndex, wrongItemsCount }) {
  const [selectedWords, setSelectedWords] = useState([])
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isSkipped, setIsSkipped] = useState(false)

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((quizData?.step_in_unit ?? 0) + 1)
  const listeningCountInUnit = quizData?.listening_count_in_unit ?? 0
  const rawTotalItemsInUnit = quizData?.total_items_in_unit ?? 0
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (skipListening ? rawTotalItemsInUnit - listeningCountInUnit : rawTotalItemsInUnit)

  useEffect(() => {
    if (quizData?.original_sentence) {
      const timer = setTimeout(() => speakText(quizData.clean_sentence || quizData.original_sentence, sourceLang), 300)
      return () => clearTimeout(timer)
    }
  }, [quizData?.original_sentence, sourceLang])

  if (!quizData) {
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

  const correctWords = quizData.correct_words || []
  const options = quizData.options || []

  const stripPunct = (str) => {
    if (typeof str !== 'string') return str
    return str.replace(/^[^\w\u00C0-\u024F\u0400-\u052F\u0370-\u03FF\u0600-\u06FF\u0900-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF\u0E00-\u0E7F\u0F00-\u0FFF\uA800-\uA82F\uA840-\uA87F]+|[^\w\u00C0-\u024F\u0400-\u052F\u0370-\u03FF\u0600-\u06FF\u0900-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF\u0E00-\u0E7F\u0F00-\u0FFF\uA800-\uA82F\uA840-\uA87F]+$/g, '')
  }

  const handleWordSelect = (word, index) => {
    if (isChecked) return
    setSelectedWords([...selectedWords, { word, index }])
  }

  const handleRemoveWord = (pos) => {
    if (isChecked) return
    const newSelected = [...selectedWords]
    newSelected.splice(pos, 1)
    setSelectedWords(newSelected)
  }

  const checkAnswer = () => {
    const stripForCompare = (s) => typeof s === 'string' ? s.replace(/[，。、；：！？,.:;!?]/g, '').toLowerCase().trim() : ''
    const userWords = selectedWords.map(w => stripForCompare(w.word))
    const correct = userWords.length === correctWords.length &&
      userWords.every((w, i) => w === stripForCompare(correctWords[i]))
    setIsCorrect(correct)
    setIsChecked(true)
    if (onAnswer) onAnswer(correct)
  }

  const handleSkipListening = () => {
    setIsSkipped(true)
    setIsCorrect(true)
    setIsChecked(true)
    if (onAnswer) onAnswer(true)
    if (onSkipListeningChange) onSkipListeningChange(true)
  }

  const handleNextQuestion = () => {
    onNextQuestion()
  }

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
            onClick={onBack}
            className="flex items-center gap-2 btn-ghost"
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          {totalItemsInUnit > 0 && (
            <span className="text-sm text-ink-500 font-medium">{t.step || '第'} {stepInUnit} / {totalItemsInUnit} {t.question || '题'}</span>
          )}
          {!isChecked && !isSkipped && (
            <motion.button
              onClick={handleSkipListening}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-400 hover:text-ochre-500 hover:bg-ochre-50 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={t.skipListening || '跳过听力'}
            >
              <SkipForward className="w-3.5 h-3.5" />
              {t.skip || '跳过'}
            </motion.button>
          )}
          {onOpenVocabList && (
            <motion.button
              onClick={onOpenVocabList}
              className="flex items-center gap-2 btn-ghost"
              whileHover={{ scale: 1.05, x: 2 }}
              whileTap={{ scale: 0.95 }}
            >
              <BookOpen className="w-4 h-4" />
              {t.vocabList || '单词表'}
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-cream-50 border border-bone-200 rounded-3xl p-8 shadow-warm-sm">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-ochre-50 text-ochre-500 rounded-full text-sm font-medium mb-4"
          >
            <Headphones className="w-4 h-4" />
            {t.listeningQuizTitle || '听力题'}
          </motion.div>
          <div className="flex items-center justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => speakText(quizData.clean_sentence || quizData.original_sentence, sourceLang)}
              className="p-3 text-ochre-500 hover:text-ochre-500 hover:bg-ochre-50 rounded-full transition-colors"
            >
              <Volume2 className="w-8 h-8" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => speakText(quizData.clean_sentence || quizData.original_sentence, sourceLang, true)}
              className="p-3 text-ink-400 hover:text-ochre-500 hover:bg-ochre-50 rounded-full transition-colors"
              title={t.slowPlay || '慢速播放'}
            >
              <Turtle className="w-7 h-7" />
            </motion.button>
          </div>
        </div>

        <div className="mb-8">
          <div className="p-4 border-2 border-dashed border-bone-300 rounded-xl flex flex-wrap gap-2 bg-cream-50/50 relative">
            <div className="flex flex-wrap gap-2 invisible" aria-hidden="true">
              {correctWords.map((_, i) => (
                <span key={`ph-${i}`} className="px-4 py-2 rounded-full text-sm font-medium">{correctWords[i]}</span>
              ))}
            </div>
            <div className="absolute inset-0 p-4 flex flex-wrap gap-2 items-center">
              {selectedWords.length === 0 && (
                <span className="italic text-ink-400 text-sm pointer-events-none">{t.tapToBuildSentence || '按顺序点击下方单词组成句子'}</span>
              )}
              <AnimatePresence mode="popLayout">
                {selectedWords.map((item, pos) => (
                  <motion.div
                    key={`sel-${item.index}`}
                    layout
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ layout: { type: 'spring', stiffness: 500, damping: 35 }, opacity: { duration: 0.15 }, scale: { duration: 0.15 } }}
                    className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer select-none ${
                      isChecked
                        ? isCorrect
                          ? 'bg-moss-50 text-moss-600 border border-moss-400'
                          : pos < correctWords.length && item.word.toLowerCase() === correctWords[pos].toLowerCase()
                            ? 'bg-moss-50 text-moss-600 border border-moss-400'
                            : 'bg-ember-50 text-ember-500 border border-ember-400'
                        : 'bg-ink-800 text-white hover:bg-ink-700'
                    }`}
                    onClick={() => handleRemoveWord(pos)}
                  >
                    {stripPunct(item.word)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {options.map((word, index) => {
              const isSelected = selectedWords.some(w => w.index === index)
              return (
                <motion.button
                  key={`opt-${index}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: isSelected ? 0 : 1, scale: isSelected ? 0 : 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleWordSelect(word, index)}
                  disabled={isSelected || isChecked}
                  className={`px-4 py-2 rounded-full text-sm font-medium select-none ${
                    isSelected
                      ? 'pointer-events-none invisible'
                      : isChecked
                        ? 'pointer-events-none bg-ink-800 text-white opacity-50'
                        : 'bg-ink-800 text-white hover:bg-ink-700'
                  }`}
                >
                  {stripPunct(word)}
                </motion.button>
              )
            })}
          </div>
        </div>

        {isChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-xl mb-6 ${isCorrect ? 'bg-moss-50 border-2 border-moss-400' : 'bg-ember-50 border-2 border-ember-400'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? <CheckCircle2 className="w-6 h-6 text-moss-600" /> : <XCircle className="w-6 h-6 text-ember-500" />}
              <span className={`font-semibold text-lg ${isCorrect ? 'text-moss-600' : 'text-ember-500'}`}>
                {isSkipped ? (t.skipped || '已跳过') : isCorrect ? t.correct : t.incorrect}
              </span>
            </div>
            {(isSkipped || !isCorrect) && (
              <p className="text-ink-600 font-medium">
                {t.correctAnswer || '正确答案'}：{correctWords.map(w => stripPunct(w)).join(' ')}
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!isChecked ? (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={checkAnswer}
              disabled={selectedWords.length === 0}
              className="flex-1 py-4 btn-primary text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNextQuestion}
              disabled={loading}
              className="flex-1 py-4 btn-primary text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ListeningQuizStep
