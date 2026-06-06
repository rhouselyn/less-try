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
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-umber-400" />
          <p className="text-lg text-umber-600">{t.loading}</p>
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

      <div className="bg-gradient-to-br from-canvas-50 via-canvas-100 to-cadmium-50 border-3 border-umber-300 rounded-3xl p-8 shadow-impasto-xl relative overflow-hidden">
        {/* 油画纹理背景 */}
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E")'}}></div>
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cadmium-100 to-umber-100 text-umber-700 rounded-full text-sm font-bold mb-4 border-2 border-cadmium-300 shadow-md"
            >
              <Languages className="w-5 h-5" />
              {t.translationQuiz || '翻译题'}
            </motion.div>
            <div className="flex items-center justify-center gap-3">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl font-bold text-umber-900"
              >
                {quizData.original_sentence}
              </motion.p>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); speakText(quizData.original_sentence, sourceLang) }}
                className="p-3 bg-cadmium-500 text-white hover:bg-cadmium-600 rounded-full transition-all shadow-lg hover:shadow-xl"
              >
                <Volume2 className="w-6 h-6" />
              </motion.button>
            </div>
          </div>

          <div className="mb-8">
            <div className="p-5 border-4 border-dashed border-umber-400 rounded-2xl flex flex-wrap gap-3 bg-gradient-to-br from-umber-50 to-canvas-200 relative shadow-inner">
              <div className="flex flex-wrap gap-3 invisible" aria-hidden="true">
                {quizData.correct_tokens.map((_, i) => (
                  <span key={`ph-${i}`} className="px-5 py-2.5 rounded-full text-sm font-semibold">{quizData.correct_tokens[i]}</span>
                ))}
              </div>
              <div className="absolute inset-0 p-5 flex flex-wrap gap-3 items-start content-start">
                {selectedTokens.length === 0 && (
                  <span className="italic text-umber-500 pointer-events-none font-medium text-base">{t.selectTokensHint}</span>
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
                        className={`px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer select-none shadow-md transition-all hover:shadow-lg ${
                          isChecked
                            ? isCorrect
                              ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white border-2 border-teal-700'
                              : isTokenCorrect
                                ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white border-2 border-teal-700'
                                : 'bg-gradient-to-r from-vermilion-400 to-vermilion-600 text-white border-2 border-vermilion-700'
                            : 'bg-gradient-to-r from-cerulean-500 to-cerulean-700 text-white hover:from-cerulean-600 hover:to-cerulean-800 border-2 border-cerulean-800'
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
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold select-none shadow-md transition-all hover:shadow-lg ${
                      isSelected
                        ? 'pointer-events-none invisible'
                        : isChecked
                          ? 'pointer-events-none bg-umber-300 text-umber-600 opacity-60'
                          : 'bg-gradient-to-r from-cadmium-500 to-orange-600 text-white hover:from-cadmium-600 hover:to-orange-700 border-2 border-orange-700'
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
              className={`p-6 rounded-2xl mb-6 border-4 shadow-lg ${isCorrect ? 'bg-gradient-to-r from-teal-100 to-teal-200 border-teal-500' : 'bg-gradient-to-r from-vermilion-100 to-vermilion-200 border-vermilion-500'}`}
            >
              <div className="flex items-center gap-4 mb-3">
                {isCorrect ? <CheckCircle2 className="w-8 h-8 text-teal-700" /> : <XCircle className="w-8 h-8 text-vermilion-700" />}
                <span className={`font-bold text-2xl ${isCorrect ? 'text-teal-800' : 'text-vermilion-800'}`}>{isCorrect ? t.correct : t.incorrect}</span>
              </div>
              {!isCorrect && (
                <p className="text-umber-700 font-semibold text-base">
                  {t.correctAnswer || '正确答案'}：{quizData.correct_translation || (quizData.correct_tokens ? quizData.correct_tokens.join('') : '')}
                </p>
              )}
            </motion.div>
          )}
        </div>

        <div className="flex gap-4">
          {!isChecked && (
            <motion.button
              whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckAnswer}
              disabled={selectedIndices.length === 0}
              className="flex-1 py-4 btn-primary text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          )}
          {isChecked && (
            <motion.button
              whileHover={{ scale: 1.01 }}
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
