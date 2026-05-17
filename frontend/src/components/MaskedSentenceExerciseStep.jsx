import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Volume2, PenLine } from 'lucide-react'
import { speakText } from '../utils/speech'

function MaskedSentenceExerciseStep({ data, onNext, onBack, onComplete, loading, t, onOpenVocabList, maskVersion, totalMasks, exerciseIndexInUnit, totalExercisesInUnit, sentencePreview, sourceLang, onAnswer }) {
  const [selectedWords, setSelectedWords] = useState([])
  const [answerChecked, setAnswerChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const stepInUnit = (exerciseIndexInUnit ?? 0) + 1
  const totalItemsInUnit = totalExercisesInUnit ?? 0
  const isLastExercise = stepInUnit >= (totalExercisesInUnit ?? 10)

  const handleWordSelect = (word, index) => {
    if (answerChecked) return
    const newSelected = [...selectedWords]
    const emptyIndex = newSelected.findIndex(w => w === null || w === undefined)
    if (emptyIndex !== -1) {
      newSelected[emptyIndex] = { word, index }
    } else {
      newSelected.push({ word, index })
    }
    setSelectedWords(newSelected)
  }

  const handleRemoveWord = (index) => {
    if (answerChecked) return
    const newSelected = [...selectedWords]
    newSelected[index] = null
    setSelectedWords(newSelected)
  }

  const checkAnswer = () => {
    const userAnswerWords = selectedWords.filter(w => w).map(w => w.word.toLowerCase())
    const correctAnswerWords = data.answer_words.map(w => w.toLowerCase())

    const correct = userAnswerWords.length === correctAnswerWords.length &&
      userAnswerWords.every((word, index) => word === correctAnswerWords[index])

    setIsCorrect(correct)
    setAnswerChecked(true)
    if (onAnswer) onAnswer(correct)
  }

  const handleNext = () => {
    setSelectedWords([])
    setAnswerChecked(false)
    setIsCorrect(false)
    onNext()
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
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors rounded-md hover:bg-stone-100"
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </motion.button>
        <div className="flex items-center gap-3">
          {totalItemsInUnit > 0 && (
            <span className="text-sm text-stone-500 font-medium">第 {stepInUnit} / {totalItemsInUnit} 题</span>
          )}
          {onOpenVocabList && (
            <motion.button
              onClick={onOpenVocabList}
              className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors rounded-md hover:bg-stone-100"
              whileHover={{ scale: 1.05, x: 2 }}
              whileTap={{ scale: 0.95 }}
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
            <PenLine className="w-4 h-4" />
            选词填空
          </motion.div>
          <div className="flex items-center justify-center gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-stone-700"
            >
              {data.masked_sentence}
            </motion.p>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => speakText(data.original_sentence || data.masked_sentence?.replace(/___/g, ''), sourceLang)}
              className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
            >
              <Volume2 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="mb-8">
          <div className="p-4 border-2 border-dashed border-stone-300 rounded-xl min-h-16 flex flex-wrap gap-2 items-center bg-stone-50/50">
            {data.answer_words.map((answerWord, idx) => {
              const filled = selectedWords[idx]
              const isSlotCorrect = filled && filled.word.toLowerCase() === answerWord.toLowerCase()
              return (
                <motion.div
                  key={`slot-${idx}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`px-4 py-2 rounded-full text-sm font-medium min-w-[80px] text-center transition-all ${
                    filled
                      ? answerChecked
                        ? isCorrect
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : isSlotCorrect
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-stone-800 text-white cursor-pointer'
                      : 'border-2 border-dashed border-stone-300 text-stone-400'
                  }`}
                  onClick={() => filled && !answerChecked && handleRemoveWord(idx)}
                >
                  {filled ? filled.word : '____'}
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {data.options.map((word, idx) => {
              const isSelected = selectedWords.some(w => w && w.index === idx)
              return (
                <motion.button
                  key={`opt-${idx}`}
                  whileHover={!answerChecked && !isSelected ? { scale: 1.05 } : {}}
                  whileTap={!answerChecked && !isSelected ? { scale: 0.95 } : {}}
                  onClick={() => handleWordSelect(word, idx)}
                  disabled={isSelected || answerChecked}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected || answerChecked
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

        {answerChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-xl mb-6 ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
              <span className={`font-semibold text-lg ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>{isCorrect ? t.correct : t.incorrect}</span>
            </div>
            {!isCorrect && (
              <p className="text-stone-700 font-medium">
                正确答案：{data.answer_words.join(' ')}
              </p>
            )}
            {isCorrect && isLastExercise && (
              <p className="font-medium mt-3 text-lg text-green-700">
                🎉 该单元学习已完成！
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!answerChecked ? (
            <motion.button
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={checkAnswer}
              disabled={selectedWords.filter(w => w).length === 0}
              className="flex-1 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={handleNext}
              disabled={loading}
              className="flex-1 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.loading}
                </>
              ) : isLastExercise ? (
                '完成'
              ) : (
                <>
                  下一题
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

export default MaskedSentenceExerciseStep
