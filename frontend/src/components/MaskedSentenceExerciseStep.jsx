import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Lightbulb, PenLine } from 'lucide-react'
import { speakText } from '../utils/speech'

function MaskedSentenceExerciseStep({ data, onNext, onBack, onComplete, loading, t, onOpenVocabList, maskVersion, totalMasks, exerciseIndexInUnit, totalExercisesInUnit, sentencePreview, sourceLang, onAnswer, reviewMode, reviewIndex, wrongItemsCount }) {
  const [selectedWords, setSelectedWords] = useState([])
  const [answerChecked, setAnswerChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [data?.masked_sentence])

  if (!data) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-cadmium-500" />
      </motion.div>
    )
  }

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((exerciseIndexInUnit ?? 0) + 1)
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (totalExercisesInUnit ?? 0)
  const isLastExercise = reviewMode ? (wrongItemsCount === 0) : (stepInUnit >= (totalExercisesInUnit ?? 10))
  const maxWords = data.answer_words.length

  const handleWordSelect = (word, index) => {
    if (answerChecked) return
    if (selectedWords.some(w => w.index === index)) return
    setSelectedWords(prev => [...prev, { word, index }])
    speakText(word, sourceLang)
  }

  const handleSelectedClick = (pos) => {
    if (answerChecked) return
    setSelectedWords(prev => prev.filter((_, i) => i !== pos))
  }

  const checkAnswer = () => {
    const userAnswerWords = selectedWords.map(w => w.word.toLowerCase())
    const correctAnswerWords = data.answer_words.map(w => w.toLowerCase())
    const correct = userAnswerWords.length === correctAnswerWords.length &&
      userAnswerWords.every((word, index) => word === correctAnswerWords[index])
    setIsCorrect(correct)
    setAnswerChecked(true)
    if (onAnswer) onAnswer(correct)
  }

  const handleNext = () => {
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
        <div className="flex items-center gap-2">
          <motion.button
            onClick={onBack}
            className="flex items-center gap-2 btn-ghost"
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          {totalItemsInUnit > 0 && (
            <span className="text-sm text-umber-500 font-medium">{(t.stepProgress || '第 {0} / {1} 题').replace('{0}', stepInUnit).replace('{1}', totalItemsInUnit)}</span>
          )}
          {onOpenVocabList && (
            <motion.button
              onClick={onOpenVocabList}
              className="flex items-center gap-2 btn-ghost"
              whileTap={{ scale: 0.98 }}
          >
            <BookOpen className="w-4 h-4" />
              {t.vocabList || '单词表'}
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-white/90 border border-stone-300 rounded-3xl p-8 shadow-impasto-sm">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-cadmium-100 text-cadmium-700 rounded-full text-sm font-medium mb-4"
          >
            <PenLine className="w-4 h-4" />
            {t.maskedSentenceTitle || '选词填空'}
          </motion.div>
          <div className="flex items-center justify-center gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-umber-700"
            >
              {data.masked_sentence}
            </motion.p>
          </div>
        </div>

        <div className="mb-8">
          <div className="p-4 border-2 border-dashed border-umber-300 rounded-xl flex flex-wrap gap-2 bg-canvas-100 relative">
            <div className="flex flex-wrap gap-2 invisible" aria-hidden="true">
              {data.answer_words.map((_, i) => (
                <span key={`ph-${i}`} className="px-4 py-2 rounded-full text-sm font-medium">{data.answer_words[i]}</span>
              ))}
              <span className="ml-auto p-2"><Lightbulb className="w-5 h-5" /></span>
            </div>
            <div className="absolute inset-0 p-4 flex flex-wrap gap-2 items-start content-start">
              {selectedWords.length === 0 && !answerChecked && (
                <span className="text-umber-400 text-sm pointer-events-none">{t.maskedHint || '点击下方选项填入...'}</span>
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
                    onClick={() => handleSelectedClick(pos)}
                    className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer select-none ${
                      answerChecked
                        ? isCorrect
                          ? 'bg-teal-100 text-teal-700 border border-teal-500'
                          : (() => {
                              const correctWord = data.answer_words[pos]
                              return correctWord && item.word.toLowerCase() === correctWord.toLowerCase()
                                ? 'bg-teal-100 text-teal-700 border border-teal-500'
                                : 'bg-vermilion-100 text-vermilion-600 border border-vermilion-500'
                            })()
                        : 'bg-umber-600 text-white hover:bg-umber-700'
                    }`}
                  >
                    {item.word}
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => speakText(data.original_sentence || data.masked_sentence?.replace(/___/g, ''), sourceLang)}
                className="ml-auto p-2 text-cadmium-500 hover:text-cadmium-500 hover:bg-cadmium-50 rounded-full transition-colors"
                title={t.playHint || '播放提示'}
              >
                <Lightbulb className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {data.options.map((word, idx) => {
              const isSelected = selectedWords.some(w => w.index === idx)
              return (
                <motion.button
                  key={`opt-${idx}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: isSelected ? 0 : 1, scale: isSelected ? 0 : 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleWordSelect(word, idx)}
                  disabled={isSelected || answerChecked}
                  className={`px-4 py-2 rounded-full text-sm font-medium select-none ${
                    isSelected
                      ? 'pointer-events-none invisible'
                      : answerChecked
                        ? 'pointer-events-none bg-umber-600 text-white opacity-50'
                        : 'bg-umber-600 text-white hover:bg-umber-700'
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
            className={`p-5 rounded-xl mb-6 ${isCorrect ? 'bg-teal-100 border-2 border-teal-500' : 'bg-vermilion-100 border-2 border-vermilion-500'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? <CheckCircle2 className="w-6 h-6 text-teal-700" /> : <XCircle className="w-6 h-6 text-vermilion-600" />}
              <span className={`font-semibold text-lg ${isCorrect ? 'text-teal-700' : 'text-vermilion-700'}`}>{isCorrect ? t.correct : t.incorrect}</span>
            </div>
            {!isCorrect && (
              <p className="text-umber-600 font-medium">
                {t.correctAnswer || '正确答案'}：{data.answer_words.join(' ')}
              </p>
            )}
            {isCorrect && isLastExercise && (
              <p className="font-medium mt-3 text-lg text-teal-600">
                🎉 {reviewMode ? (t.reviewComplete || '错题已复习完！') : (t.unitStudyComplete || '该单元学习已完成！')}
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!answerChecked ? (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={checkAnswer}
              disabled={selectedWords.length === 0}
              className="flex-1 py-4 btn-primary text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              disabled={loading}
              className="flex-1 py-4 btn-primary text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.loading}
                </>
              ) : isLastExercise ? (
                t.done || '完成'
              ) : (
                <>
                  {t.nextQuestion || '下一题'}
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
