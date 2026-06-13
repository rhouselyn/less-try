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
        <Loader2 className="w-5 h-5 animate-spin text-soft-400" />
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
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          {totalItemsInUnit > 0 && (
            <span className="text-sm text-theme-text-secondary font-medium">{(t.stepProgress || '第 {0} / {1} 题').replace('{0}', stepInUnit).replace('{1}', totalItemsInUnit)}</span>
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

      <div className="bg-white rounded-3xl shadow-card p-8">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-theme-bg-subtle text-theme-primary rounded-full text-sm font-medium mb-4"
          >
            <PenLine className="w-4 h-4" />
            {t.maskedSentenceTitle || '选词填空'}
          </motion.div>
          <div className="flex items-center justify-center gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-theme-text"
            >
              {data.masked_sentence}
            </motion.p>
          </div>
        </div>

        <div className="mb-8">
          <div className="p-4 border border-dashed border-theme-border rounded-2xl flex flex-wrap gap-2 bg-theme-bg/50 relative">
            <div className="flex flex-wrap gap-2 invisible" aria-hidden="true">
              {data.answer_words.map((_, i) => (
                <span key={`ph-${i}`} className="px-4 py-2 rounded-2xl text-sm font-medium">{data.answer_words[i]}</span>
              ))}
              <span className="ml-auto p-2"><Lightbulb className="w-5 h-5" /></span>
            </div>
            <div className="absolute inset-0 p-4 flex flex-wrap gap-2 items-start content-start">
              {selectedWords.length === 0 && !answerChecked && (
                <span className="text-theme-text-muted text-sm pointer-events-none">{t.maskedHint || '点击下方选项填入...'}</span>
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
                    className={`px-4 py-2 rounded-2xl text-sm font-medium cursor-pointer select-none transition-all duration-200 ${
                      answerChecked
                        ? isCorrect
                          ? 'bg-theme-success-bg text-theme-secondary ring-2 ring-mint-400/50'
                          : (() => {
                              const correctWord = data.answer_words[pos]
                              return correctWord && item.word.toLowerCase() === correctWord.toLowerCase()
                                ? 'bg-theme-success-bg text-theme-secondary ring-2 ring-mint-400/50'
                                : 'bg-theme-danger-bg text-theme-danger ring-2 ring-rose-400/50'
                            })()
                        : 'bg-theme-primary text-white shadow-card-active'
                    }`}
                  >
                    {item.word}
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => speakText(data.original_sentence || data.masked_sentence?.replace(/___/g, ''), sourceLang)}
                className="ml-auto p-2 text-soft-400 hover:text-theme-primary hover:bg-theme-bg-subtle rounded-full transition-colors"
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
                  className={`px-4 py-2 rounded-2xl text-sm font-medium select-none transition-all duration-200 border-0 ${
                    isSelected
                      ? 'pointer-events-none invisible'
                      : answerChecked
                        ? 'pointer-events-none bg-white shadow-card-active text-theme-text opacity-50'
                        : 'bg-white shadow-card-active hover:shadow-card hover:-translate-y-0.5 text-theme-text'
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
            className={`p-5 rounded-2xl mb-6 ${isCorrect ? 'bg-theme-success-bg ring-2 ring-mint-400/50' : 'bg-theme-danger-bg ring-2 ring-rose-400/50'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? <CheckCircle2 className="w-6 h-6 text-theme-secondary" /> : <XCircle className="w-6 h-6 text-theme-danger" />}
              <span className={`font-semibold text-lg ${isCorrect ? 'text-theme-secondary' : 'text-theme-danger'}`}>{isCorrect ? t.correct : t.incorrect}</span>
            </div>
            {!isCorrect && (
              <p className="text-theme-text font-medium">
                {t.correctAnswer || '正确答案'}：{data.answer_words.join(' ')}
              </p>
            )}
            {isCorrect && isLastExercise && (
              <p className="font-medium mt-3 text-lg text-theme-secondary">
                🎉 {reviewMode ? (t.reviewComplete || '错题已复习完！') : (t.unitStudyComplete || '该单元学习已完成！')}
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!answerChecked ? (
            <motion.button
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={checkAnswer}
              disabled={selectedWords.length === 0}
              className="flex-1 py-4 btn-primary text-lg rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={handleNext}
              disabled={loading}
              className="flex-1 py-4 btn-primary text-lg rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
