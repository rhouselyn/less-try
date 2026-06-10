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
        <Loader2 className="w-5 h-5 animate-spin text-[#ff006e]" />
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
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          {totalItemsInUnit > 0 && (
            <span className="text-sm text-[#4a4a6a] font-bold">{(t.stepProgress || '第 {0} / {1} 题').replace('{0}', stepInUnit).replace('{1}', totalItemsInUnit)}</span>
          )}
          {onOpenVocabList && (
            <motion.button
              onClick={onOpenVocabList}
              className="flex items-center gap-2 btn-ghost"
            >
              <BookOpen className="w-4 h-4" />
              {t.vocabList || '单词表'}
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-white border-[3px] border-[#1a1a2e] p-8 shadow-[3px_3px_0_#1a1a2e]">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#fff0f5] text-[#cc0058] text-sm font-bold mb-4"
          >
            <PenLine className="w-4 h-4" />
            {t.maskedSentenceTitle || '选词填空'}
          </motion.div>
          <div className="flex items-center justify-center gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-[#2d2d4a]"
            >
              {data.masked_sentence}
            </motion.p>
          </div>
        </div>

        <div className="mb-8">
          <div className="p-4 border-[3px] border-dashed border-[#1a1a2e] flex flex-wrap gap-2 bg-[#f0f0ff] relative">
            <div className="flex flex-wrap gap-2 invisible" aria-hidden="true">
              {data.answer_words.map((_, i) => (
                <span key={`ph-${i}`} className="px-4 py-2 text-sm font-bold">{data.answer_words[i]}</span>
              ))}
              <span className="ml-auto p-2"><Lightbulb className="w-5 h-5" /></span>
            </div>
            <div className="absolute inset-0 p-4 flex flex-wrap gap-2 items-start content-start">
              {selectedWords.length === 0 && !answerChecked && (
                <span className="text-bone-300 text-sm pointer-events-none">{t.maskedHint || '点击下方选项填入...'}</span>
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
                    className={`px-4 py-2 text-sm font-bold cursor-pointer select-none border-[3px] border-[#1a1a2e] shadow-[2px_2px_0_#1a1a2e] ${
                      answerChecked
                        ? isCorrect
                          ? 'bg-[#06d6a0] text-white border-[#1a1a2e]'
                          : (() => {
                              const correctWord = data.answer_words[pos]
                              return correctWord && item.word.toLowerCase() === correctWord.toLowerCase()
                                ? 'bg-[#06d6a0] text-white border-[#1a1a2e]'
                                : 'bg-[#ef476f] text-white border-[#1a1a2e]'
                            })()
                        : 'bg-white shadow-[2px_2px_0_#1a1a2e] hover:shadow-[1px_1px_0_#1a1a2e] hover:translate-x-[1px] hover:translate-y-[1px] transition-all duration-150'
                    }`}
                  >
                    {item.word}
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.button
                onClick={() => speakText(data.original_sentence || data.masked_sentence?.replace(/___/g, ''), sourceLang)}
                className="ml-auto p-2 text-[#ff006e] hover:text-[#cc0058] hover:bg-[#fff0f5] transition-colors"
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
                  className={`px-4 py-2 text-sm font-bold select-none border-[3px] border-[#1a1a2e] bg-white shadow-[2px_2px_0_#1a1a2e] ${
                    isSelected
                      ? 'pointer-events-none invisible'
                      : answerChecked
                        ? 'pointer-events-none bg-white text-[#1a1a2e]'
                        : 'hover:shadow-[1px_1px_0_#1a1a2e] hover:translate-x-[1px] hover:translate-y-[1px] transition-all duration-150'
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
            className={`p-5 mb-6 border-[3px] shadow-[3px_3px_0_#1a1a2e] ${isCorrect ? 'bg-[#e6fff5] border-[#06d6a0]' : 'bg-[#fff0f0] border-[#ef476f]'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? <CheckCircle2 className="w-6 h-6 text-[#06d6a0]" /> : <XCircle className="w-6 h-6 text-[#ef476f]" />}
              <span className={`font-black uppercase text-lg ${isCorrect ? 'text-[#06d6a0]' : 'text-[#ef476f]'}`}>{isCorrect ? t.correct : t.incorrect}</span>
            </div>
            {!isCorrect && (
              <p className="text-[#2d2d4a] font-bold">
                {t.correctAnswer || '正确答案'}：{data.answer_words.join(' ')}
              </p>
            )}
            {isCorrect && isLastExercise && (
              <p className="font-bold mt-3 text-lg text-[#06d6a0]">
                🎉 {reviewMode ? (t.reviewComplete || '错题已复习完！') : (t.unitStudyComplete || '该单元学习已完成！')}
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!answerChecked ? (
            <motion.button
              onClick={checkAnswer}
              disabled={selectedWords.length === 0}
              className="flex-1 py-4 btn-primary text-lg border-[3px] border-[#1a1a2e] font-black uppercase disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          ) : (
            <motion.button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 py-4 btn-primary text-lg border-[3px] border-[#1a1a2e] font-black uppercase disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
