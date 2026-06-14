import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Lightbulb, Languages } from 'lucide-react'
import { speakText } from '../utils/speech'

function TranslationReconstructionStep({ data, onNext, onBack, onComplete, loading, t, onOpenVocabList, exerciseIndexInUnit, totalExercisesInUnit, sentencePreview, sourceLang, onAnswer, reviewMode, reviewIndex, wrongItemsCount }) {
  const [selectedTokens, setSelectedTokens] = useState([])
  const [answerChecked, setAnswerChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [data?.native_translation])

  if (!data) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
      </motion.div>
    )
  }

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((exerciseIndexInUnit ?? 0) + 1)
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (totalExercisesInUnit ?? 0)
  const isLastExercise = reviewMode ? (wrongItemsCount === 0) : (stepInUnit >= (totalExercisesInUnit ?? 10))
  const maxWords = data.original_tokens.length

  const handleTokenSelect = (token, index) => {
    if (answerChecked) return
    if (selectedTokens.some(t => t.index === index)) return
    setSelectedTokens(prev => [...prev, { token, index }])
    speakText(token, sourceLang)
  }

  const handleSelectedClick = (idx) => {
    if (answerChecked) return
    const newSelected = [...selectedTokens]
    newSelected.splice(idx, 1)
    setSelectedTokens(newSelected)
  }

  const stripPunctuation = (str) => str.replace(/[，。、；：！？,.:;!?]/g, '')

  const checkAnswer = () => {
    const userTokens = selectedTokens.map(t => stripPunctuation(t.token.toLowerCase()))
    const correctTokens = data.original_tokens.map(t => stripPunctuation(t.toLowerCase()))
    const correct = userTokens.length === correctTokens.length &&
      userTokens.every((token, index) => token === correctTokens[index])
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
            <span className="text-sm text-ink-500 font-medium">{(t.stepProgress || '第 {0} / {1} 题').replace('{0}', stepInUnit).replace('{1}', totalItemsInUnit)}</span>
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

      <div className="bg-parchment-50 border-2 border-aged-200 rounded-md p-8 shadow-retro-sm">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-500 rounded-none text-sm font-medium mb-4"
          >
            <Languages className="w-4 h-4" />
            {t.translationReconstructionTitle || '翻译还原'}
          </motion.div>
          <div className="flex items-center justify-center gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-ink-600 italic"
            >
              {data.native_translation}
            </motion.p>
          </div>
        </div>

        <div className="mb-8">
          <div className="p-4 border-2 border-dashed border-aged-300 rounded-sm flex flex-wrap gap-2 bg-parchment-50/50 relative">
            <div className="flex flex-wrap gap-2 invisible" aria-hidden="true">
              {data.original_tokens.map((_, i) => (
                <span key={`ph-${i}`} className="px-4 py-2 rounded-none text-sm font-medium">{data.original_tokens[i]}</span>
              ))}
              <span className="ml-auto p-2"><Lightbulb className="w-5 h-5" /></span>
            </div>
            <div className="absolute inset-0 p-4 flex flex-wrap gap-2 items-start content-start">
              {selectedTokens.length === 0 && (
                <span className="italic text-ink-400 text-sm pointer-events-none">{t.tapToReconstruct || '按顺序点击下方词语还原句子'}</span>
              )}
              <AnimatePresence mode="popLayout">
                {selectedTokens.map((item, idx) => {
                  const isTokenCorrect = idx < data.original_tokens.length &&
                    stripPunctuation(item.token.toLowerCase()) === stripPunctuation(data.original_tokens[idx].toLowerCase())
                  return (
                    <motion.div
                      key={`sel-${item.index}`}
                      layout
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ layout: { type: 'spring', stiffness: 500, damping: 35 }, opacity: { duration: 0.15 }, scale: { duration: 0.15 } }}
                      onClick={() => handleSelectedClick(idx)}
                      className={`px-4 py-2 rounded-none text-sm font-bold cursor-pointer select-none ${
                        answerChecked
                          ? isCorrect
                            ? 'bg-olive-50 text-olive-500 border-2 border-olive-400'
                            : isTokenCorrect
                              ? 'bg-olive-50 text-olive-500 border-2 border-olive-400'
                              : 'bg-rust-50 text-rust-400 border-2 border-rust-400'
                          : 'bg-amber-400 text-parchment-50 hover:bg-amber-500 border-2 border-amber-500'
                      }`}
                    >
                      {item.token}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => speakText(data.original_tokens?.join(' ') || '', sourceLang)}
                className="ml-auto p-2 text-amber-400 hover:text-amber-500 hover:bg-amber-50 rounded-none transition-colors"
                title={t.playHint || '播放提示'}
              >
                <Lightbulb className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {data.options.map((token, idx) => {
              const isSelected = selectedTokens.some(t => t.index === idx)
              return (
                <motion.button
                  key={`opt-${idx}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: isSelected ? 0 : 1, scale: isSelected ? 0 : 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleTokenSelect(token, idx)}
                  disabled={isSelected || answerChecked}
                  className={`px-4 py-2 rounded-none text-sm font-bold select-none ${
                    isSelected
                      ? 'pointer-events-none invisible'
                      : answerChecked
                        ? 'pointer-events-none bg-amber-400 text-parchment-50 opacity-50 border-2 border-amber-500'
                        : 'bg-amber-400 text-parchment-50 hover:bg-amber-500 border-2 border-amber-500'
                  }`}
                >
                  {token}
                </motion.button>
              )
            })}
          </div>
        </div>

        {answerChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-sm mb-6 ${isCorrect ? 'bg-olive-50 border-4 border-olive-400' : 'bg-rust-50 border-4 border-rust-400'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? <CheckCircle2 className="w-6 h-6 text-olive-600" /> : <XCircle className="w-6 h-6 text-rust-500" />}
              <span className={`font-bold text-lg ${isCorrect ? 'text-olive-600' : 'text-rust-500'}`}>{isCorrect ? t.correct : t.incorrect}</span>
            </div>
            {!isCorrect && (
              <p className="text-ink-600 font-medium">
                {t.correctAnswer || '正确答案'}：{data.original_tokens.join(' ')}
              </p>
            )}
            {isCorrect && isLastExercise && (
              <p className="font-medium mt-3 text-lg text-olive-600">
                🎉 {reviewMode ? (t.reviewComplete || '错题已复习完！') : (t.unitStudyComplete || '该单元学习已完成！')}
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
              disabled={selectedTokens.length === 0}
              className="flex-1 py-4 btn-primary text-lg rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={handleNext}
              disabled={loading}
              className="flex-1 py-4 btn-primary text-lg rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

export default TranslationReconstructionStep
