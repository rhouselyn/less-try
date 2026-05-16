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

function ListeningQuizStep({ quizData, onNextQuestion, onBack, loading, t, onOpenVocabList, sourceLang, onAnswer }) {
  const [selectedWords, setSelectedWords] = useState([])
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
  const correctWords = quizData.correct_words || []
  const options = quizData.options || []

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
    const userWords = selectedWords.map(w => w.word.toLowerCase())
    const correct = userWords.length === correctWords.length &&
      userWords.every((w, i) => w === correctWords[i].toLowerCase())
    setIsCorrect(correct)
    setIsChecked(true)
    if (onAnswer) onAnswer(correct)
  }

  const handleNextQuestion = () => {
    setSelectedWords([])
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
            className="text-2xl font-semibold text-stone-800 mb-4"
          >
            听一听，选出听到的单词
          </motion.h2>
          <div className="flex items-center justify-center gap-2">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => speakText(quizData.original_sentence, sourceLang)}
              className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
            >
              <Volume2 className="w-6 h-6" />
            </motion.button>
            <span className="text-sm text-stone-400">点击播放</span>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            你的答案
          </h3>
          <div className="p-4 border-2 border-dashed border-stone-300 rounded-lg min-h-16 flex flex-wrap gap-2 items-center bg-stone-50">
            <AnimatePresence>
              {selectedWords.map((item, pos) => (
                <motion.div
                  key={`sel-${item.index}-${pos}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  whileHover={{ scale: 1.05 }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer ${
                    isChecked
                      ? isCorrect
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : pos < correctWords.length && item.word.toLowerCase() === correctWords[pos].toLowerCase()
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-stone-800 text-white'
                  }`}
                  onClick={() => handleRemoveWord(pos)}
                >
                  {item.word}
                </motion.div>
              ))}
            </AnimatePresence>
            {selectedWords.length === 0 && (
              <span className="italic text-stone-400 text-sm">按顺序点击下方单词组成句子</span>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            选择单词
          </h3>
          <div className="flex flex-wrap gap-2">
            {options.map((word, index) => {
              const isSelected = selectedWords.some(w => w.index === index)
              return (
                <motion.button
                  key={`opt-${index}`}
                  whileHover={!isChecked && !isSelected ? { scale: 1.05 } : {}}
                  whileTap={!isChecked && !isSelected ? { scale: 0.95 } : {}}
                  onClick={() => handleWordSelect(word, index)}
                  disabled={isSelected || isChecked}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected || isChecked
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      : 'bg-white text-stone-800 border border-stone-200/80 hover:border-stone-300 hover:shadow-sm'
                  }`}
                >
                  {word}
                </motion.button>
              )
            })}
          </div>
        </div>

        {isChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-xl mb-6 ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <span className={`font-semibold text-lg ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {isCorrect ? t.correct : t.incorrect}
              </span>
            </div>
            {!isCorrect && (
              <p className="text-stone-700 font-medium">
                正确答案：{correctWords.join(' ')}
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
