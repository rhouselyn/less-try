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
        <Loader2 className="w-5 h-5 animate-spin text-cadmium-400" />
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

      <div className="bg-gradient-to-br from-teal-50 via-canvas-100 to-cadmium-50 border-3 border-teal-300 rounded-3xl p-8 shadow-impasto-xl relative overflow-hidden">
        {/* 油画纹理背景 */}
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E")'}}></div>
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-teal-100 to-cerulean-100 text-teal-700 rounded-full text-sm font-bold mb-4 border-2 border-teal-300 shadow-md"
            >
              <PenLine className="w-5 h-5" />
              {t.maskedSentenceTitle || '选词填空'}
            </motion.div>
            <div className="flex items-center justify-center gap-2">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-bold text-umber-800"
              >
                {data.masked_sentence}
              </motion.p>
            </div>
          </div>

          <div className="mb-8">
            <div className="p-5 border-4 border-dashed border-teal-400 rounded-2xl flex flex-wrap gap-3 bg-gradient-to-br from-teal-50 to-canvas-200 relative shadow-inner">
              <div className="flex flex-wrap gap-3 invisible" aria-hidden="true">
                {data.answer_words.map((_, i) => (
                  <span key={`ph-${i}`} className="px-5 py-2.5 rounded-full text-sm font-semibold">{data.answer_words[i]}</span>
                ))}
                <span className="ml-auto p-2"><Lightbulb className="w-5 h-5" /></span>
              </div>
              <div className="absolute inset-0 p-5 flex flex-wrap gap-3 items-start content-start">
                {selectedWords.length === 0 && !answerChecked && (
                  <span className="text-umber-500 text-sm pointer-events-none font-medium">{t.maskedHint || '点击下方选项填入...'}</span>
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
                      className={`px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer select-none shadow-md transition-all hover:shadow-lg ${
                        answerChecked
                          ? isCorrect
                            ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white border-2 border-teal-700'
                            : (() => {
                                const correctWord = data.answer_words[pos]
                                return correctWord && item.word.toLowerCase() === correctWord.toLowerCase()
                                  ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white border-2 border-teal-700'
                                  : 'bg-gradient-to-r from-vermilion-400 to-vermilion-600 text-white border-2 border-vermilion-700'
                              })()
                          : 'bg-gradient-to-r from-cerulean-500 to-cerulean-700 text-white hover:from-cerulean-600 hover:to-cerulean-800 border-2 border-cerulean-800'
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
                  className="ml-auto p-3 bg-teal-500 text-white hover:bg-teal-600 rounded-full transition-all shadow-lg hover:shadow-xl"
                  title={t.playHint || '播放提示'}
                >
                  <Lightbulb className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex flex-wrap gap-3">
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
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold select-none shadow-md transition-all hover:shadow-lg ${
                      isSelected
                        ? 'pointer-events-none invisible'
                        : answerChecked
                          ? 'pointer-events-none bg-umber-300 text-umber-600 opacity-60'
                          : 'bg-gradient-to-r from-teal-500 to-teal-700 text-white hover:from-teal-600 hover:to-teal-800 border-2 border-teal-800'
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
              className={`p-6 rounded-2xl mb-6 border-4 shadow-lg ${isCorrect ? 'bg-gradient-to-r from-teal-100 to-teal-200 border-teal-500' : 'bg-gradient-to-r from-vermilion-100 to-vermilion-200 border-vermilion-500'}`}
            >
              <div className="flex items-center gap-4 mb-3">
                {isCorrect ? <CheckCircle2 className="w-8 h-8 text-teal-700" /> : <XCircle className="w-8 h-8 text-vermilion-700" />}
                <span className={`font-bold text-2xl ${isCorrect ? 'text-teal-800' : 'text-vermilion-800'}`}>{isCorrect ? t.correct : t.incorrect}</span>
              </div>
              {!isCorrect && (
                <p className="text-umber-700 font-semibold text-base">
                  {t.correctAnswer || '正确答案'}：{data.answer_words.join(' ')}
                </p>
              )}
              {isCorrect && isLastExercise && (
                <p className="font-bold mt-4 text-xl text-teal-700">
                  🎉 {reviewMode ? (t.reviewComplete || '错题已复习完！') : (t.unitStudyComplete || '该单元学习已完成！')}
                </p>
              )}
            </motion.div>
          )}
        </div>

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
