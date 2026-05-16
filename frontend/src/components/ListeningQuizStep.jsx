import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Volume2, Headphones } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

const LANG_MAP = {
  'en': 'en-US',
  'zh': 'zh-CN',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'es': 'es-ES',
  'it': 'it-IT',
  'pt': 'pt-PT',
  'ru': 'ru-RU',
}

function speakText(text, sourceLang = 'en') {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = LANG_MAP[sourceLang] || 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }
}

function ListeningQuizStep({ quizData, onNextQuestion, onBack, loading, t, onOpenVocabList, sourceLang }) {
  const [selectedOption, setSelectedOption] = useState(null)
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const autoSpeak = useCallback(() => {
    if (quizData?.original_sentence) {
      setTimeout(() => speakText(quizData.original_sentence, sourceLang), 300)
    }
  }, [quizData?.original_sentence, sourceLang])

  useEffect(() => {
    autoSpeak()
  }, [autoSpeak])

  if (!quizData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-stone-400" />
          <p className="text-lg text-stone-600">{t.loading}</p>
        </div>
      </motion.div>
    )
  }

  const stepInUnit = (quizData.step_in_unit ?? 0) + 1
  const totalItemsInUnit = quizData.total_items_in_unit ?? 0

  const handleOptionSelect = (index) => {
    if (isChecked) return
    setSelectedOption(index)
  }

  const handleCheckAnswer = () => {
    if (selectedOption === null) return
    const correct = selectedOption === quizData.correct_index
    setIsCorrect(correct)
    setIsChecked(true)
  }

  const handleNextQuestion = () => {
    setSelectedOption(null)
    setIsChecked(false)
    setIsCorrect(false)
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
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors rounded-md hover:bg-stone-100"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </motion.button>
        <div className="flex items-center gap-3">
          {totalItemsInUnit > 0 && (
            <span className="text-sm text-stone-500 font-medium">
              第 {stepInUnit} / {totalItemsInUnit} 题
            </span>
          )}
          {onOpenVocabList && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={onOpenVocabList}
              className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors rounded-md hover:bg-stone-100"
            >
              <BookOpen className="w-4 h-4" />
              单词表
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium mb-4"
          >
            <Headphones className="w-4 h-4" />
            听力题
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-2xl font-semibold text-stone-800 mb-6"
          >
            听一听，选出你听到的句子
          </motion.h2>

          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => speakText(quizData.original_sentence, sourceLang)}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-200 hover:shadow-xl hover:shadow-amber-300 transition-shadow"
          >
            <Volume2 className="w-10 h-10" />
          </motion.button>
          <p className="text-sm text-stone-400 mt-3">点击播放</p>
        </div>

        <div className="space-y-3">
          {quizData.options.map((option, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={!isChecked ? { scale: 1.01 } : {}}
              whileTap={!isChecked ? { scale: 0.99 } : {}}
              onClick={() => handleOptionSelect(index)}
              disabled={isChecked}
              className={`w-full py-4 px-6 text-left rounded-xl transition-all border ${
                isChecked
                  ? index === quizData.correct_index
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : selectedOption === index
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-white border-stone-200/60 text-stone-400'
                  : selectedOption === index
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                  : 'bg-white border-stone-200/80 text-stone-700 hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                  isChecked
                    ? index === quizData.correct_index
                      ? 'bg-green-200 text-green-700'
                      : selectedOption === index
                      ? 'bg-red-200 text-red-700'
                      : 'bg-stone-100 text-stone-400'
                    : selectedOption === index
                    ? 'bg-amber-200 text-amber-700'
                    : 'bg-stone-100 text-stone-500'
                }`}>
                  {isChecked && index === quizData.correct_index ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isChecked && selectedOption === index ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>
                <span className="text-base leading-relaxed">{option}</span>
              </div>
            </motion.button>
          ))}
        </div>

        {isChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`mt-6 p-5 rounded-xl ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}
          >
            <div className="flex items-center gap-3">
              {isCorrect ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 10 }}
                >
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 10 }}
                >
                  <XCircle className="w-6 h-6 text-red-600" />
                </motion.div>
              )}
              <span className={`font-semibold text-lg ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {isCorrect ? t.correct : t.incorrect}
              </span>
            </div>
            {!isCorrect && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-2 text-stone-700 font-medium"
              >
                正确答案：{quizData.options[quizData.correct_index]}
              </motion.p>
            )}
          </motion.div>
        )}

        <div className="mt-6 flex gap-4">
          {!isChecked ? (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckAnswer}
              disabled={selectedOption === null}
              className="flex-1 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {t.checkAnswer}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNextQuestion}
              disabled={loading}
              className="flex-1 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
