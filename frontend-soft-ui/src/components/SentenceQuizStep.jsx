import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Volume2, Languages } from 'lucide-react'
import { speakText } from '../utils/speech'

function SentenceQuizStep({ quizData, onNextQuestion, onBack, onComplete, loading, t, onOpenVocabList, sourceLang, onAnswer, skipListening, reviewMode, reviewIndex, wrongItemsCount }) {
  const [selectedIndices, setSelectedIndices] = useState([])
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((quizData?.step_in_unit ?? 0) + 1)
  const listeningCountInUnit = quizData?.listening_count_in_unit ?? 0
  const rawTotalItemsInUnit = quizData?.total_items_in_unit ?? 0
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (skipListening ? rawTotalItemsInUnit - listeningCountInUnit : rawTotalItemsInUnit)
  const maxWords = quizData?.correct_tokens?.length ?? 0

  const autoSpeak = useCallback(() => {
    if (quizData?.original_sentence) {
      setTimeout(() => speakText(quizData.original_sentence, sourceLang), 300)
    }
  }, [quizData?.original_sentence, sourceLang])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [quizData?.original_sentence])

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
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-lg text-slate-700">{t.loading}</p>
        </div>
      </motion.div>
    )
  }

  const stripPunctuation = (str) => typeof str === 'string' ? str.replace(/[，。、；：！？,.:;!?]/g, '') : str
  const displayToken = (token) => typeof token === 'string' ? token.replace(/[，。、；：！？,.:;!?]/g, '') : token

  const handleTokenClick = (tokenIndex) => {
    if (isChecked) return
    const pos = selectedIndices.indexOf(tokenIndex)
    if (pos > -1) {
      setSelectedIndices([...selectedIndices.slice(0, pos), ...selectedIndices.slice(pos + 1)])
    } else {
      setSelectedIndices([...selectedIndices, tokenIndex])
    }
  }

  const handleSelectedClick = (pos) => {
    if (isChecked) return
    setSelectedIndices([...selectedIndices.slice(0, pos), ...selectedIndices.slice(pos + 1)])
  }

  const handleCheckAnswer = () => {
    const userTokens = selectedIndices.map(i => stripPunctuation(quizData.tokens[i]))
    const correctTokens = quizData.correct_tokens.map(t => stripPunctuation(t))
    const isCorrectAnswer = JSON.stringify(userTokens) === JSON.stringify(correctTokens)
    setIsCorrect(isCorrectAnswer)
    setIsChecked(true)
    if (onAnswer) onAnswer(isCorrectAnswer)
  }

  const handleNextQuestion = () => {
    onNextQuestion()
  }

  const selectedTokens = selectedIndices.map(i => quizData.tokens[i])

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
            <span className="text-sm text-slate-500 font-medium">{(t.stepProgress || '第 {0} / {1} 题').replace('{0}', stepInUnit).replace('{1}', totalItemsInUnit)}</span>
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

      <div className="bg-white rounded-3xl shadow-soft-md p-8">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-soft-50 text-soft-500 rounded-full text-sm font-medium mb-4"
          >
            <Languages className="w-4 h-4" />
            {t.translationQuiz || '翻译题'}
          </motion.div>
          <div className="flex items-center justify-center gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-700"
            >
              {quizData.original_sentence}
            </motion.p>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); speakText(quizData.original_sentence, sourceLang) }}
              className="p-2 text-soft-500 hover:text-soft-500 hover:bg-soft-50 rounded-full transition-colors"
            >
              <Volume2 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="mb-8">
          <div className="p-4 border border-dashed border-slate-200 rounded-2xl flex flex-wrap gap-2 bg-slate-50/50 relative">
            <div className="flex flex-wrap gap-2 invisible" aria-hidden="true">
              {quizData.correct_tokens.map((_, i) => (
                <span key={`ph-${i}`} className="px-4 py-2 rounded-2xl text-sm font-medium">{quizData.correct_tokens[i]}</span>
              ))}
            </div>
            <div className="absolute inset-0 p-4 flex flex-wrap gap-2 items-start content-start">
              {selectedTokens.length === 0 && (
                <span className="italic text-slate-400 pointer-events-none">{t.selectTokensHint}</span>
              )}
              <AnimatePresence mode="popLayout">
                {selectedTokens.map((token, pos) => {
                  const isTokenCorrect = pos < quizData.correct_tokens.length &&
                    stripPunctuation(token) === stripPunctuation(quizData.correct_tokens[pos])
                  return (
                    <motion.div
                      key={`sel-${selectedIndices[pos]}`}
                      layout
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ layout: { type: 'spring', stiffness: 500, damping: 35 }, opacity: { duration: 0.15 }, scale: { duration: 0.15 } }}
                      onClick={() => handleSelectedClick(pos)}
                      className={`px-4 py-2 rounded-2xl text-sm font-medium cursor-pointer select-none transition-all duration-200 ${
                        isChecked
                          ? isCorrect
                            ? 'bg-mint-50 text-mint-600 ring-2 ring-mint-400/50'
                            : isTokenCorrect
                              ? 'bg-mint-50 text-mint-600 ring-2 ring-mint-400/50'
                              : 'bg-rose-50 text-rose-500 ring-2 ring-rose-400/50'
                          : 'bg-soft-500 text-white shadow-soft-sm'
                      }`}
                    >
                      {displayToken(token)}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            {quizData.tokens.map((token, index) => {
              const isSelected = selectedIndices.includes(index)
              return (
                <motion.button
                  key={`opt-${index}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: isSelected ? 0 : 1, scale: isSelected ? 0 : 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleTokenClick(index)}
                  disabled={isSelected || isChecked}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium select-none transition-all duration-200 border-0 ${
                    isSelected
                      ? 'pointer-events-none invisible'
                      : isChecked
                        ? 'pointer-events-none bg-white shadow-soft-sm text-slate-700 opacity-50'
                        : 'bg-white shadow-soft-sm hover:shadow-soft-md hover:-translate-y-0.5 text-slate-700'
                  }`}
                >
                  {displayToken(token)}
                </motion.button>
              )
            })}
          </div>
        </div>

        {isChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`p-5 rounded-2xl mb-6 ${isCorrect ? 'bg-mint-50 ring-2 ring-mint-400/50' : 'bg-rose-50 ring-2 ring-rose-400/50'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? <CheckCircle2 className="w-6 h-6 text-mint-600" /> : <XCircle className="w-6 h-6 text-rose-500" />}
              <span className={`font-semibold text-lg ${isCorrect ? 'text-mint-600' : 'text-rose-500'}`}>{isCorrect ? t.correct : t.incorrect}</span>
            </div>
            {!isCorrect && (
              <p className="text-slate-700 font-medium">
                {t.correctAnswer || '正确答案'}：{quizData.correct_translation || (quizData.correct_tokens ? quizData.correct_tokens.join('') : '')}
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!isChecked && (
            <motion.button
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={handleCheckAnswer}
              disabled={selectedIndices.length === 0}
              className="flex-1 py-4 btn-primary text-lg rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          )}
          {isChecked && (
            <motion.button
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={handleNextQuestion}
              disabled={loading}
              className="flex-1 py-4 btn-primary text-lg rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.loading}
                </>
              ) : (
                <>
                  {t.continueLearning || '继续学习'}
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

export default SentenceQuizStep
