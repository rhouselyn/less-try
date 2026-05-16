import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, X, BookOpen, Volume2 } from 'lucide-react'

function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }
}

function SentenceQuizStep({ quizData, onNextQuestion, onBack, onComplete, loading, t, onOpenVocabList }) {
  const [selectedIndices, setSelectedIndices] = useState([])
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const autoSpeak = useCallback(() => {
    if (quizData?.original_sentence) {
      setTimeout(() => speakText(quizData.original_sentence), 300)
    }
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
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-stone-400" />
          <p className="text-lg text-stone-600">{t.loading}</p>
        </div>
      </motion.div>
    )
  }

  const handleTokenClick = (tokenIndex) => {
    if (isChecked) return
    const pos = selectedIndices.indexOf(tokenIndex)
    if (pos > -1) {
      setSelectedIndices([...selectedIndices.slice(0, pos), ...selectedIndices.slice(pos + 1)])
    } else {
      setSelectedIndices([...selectedIndices, tokenIndex])
    }
  }

  const handleRemoveToken = (pos) => {
    if (isChecked) return
    setSelectedIndices([...selectedIndices.slice(0, pos), ...selectedIndices.slice(pos + 1)])
  }

  const stripPunctuation = (str) => typeof str === 'string' ? str.replace(/[，。、；：！？,.:;!?]/g, '') : str

  const handleCheckAnswer = () => {
    const userTokens = selectedIndices.map(i => stripPunctuation(quizData.tokens[i]))
    const correctTokens = quizData.correct_tokens.map(t => stripPunctuation(t))
    const isCorrectAnswer = JSON.stringify(userTokens) === JSON.stringify(correctTokens)
    setIsCorrect(isCorrectAnswer)
    setIsChecked(true)
  }

  const handleNextQuestion = () => {
    setSelectedIndices([])
    setIsChecked(false)
    setIsCorrect(false)
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
      <div className="flex justify-between items-center mb-8">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors rounded-md hover:bg-stone-100"
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </motion.button>
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onOpenVocabList}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors rounded-md hover:bg-stone-100"
          whileHover={{ scale: 1.05, x: 2 }}
          whileTap={{ scale: 0.95 }}
        >
          <BookOpen className="w-4 h-4" />
          单词表
        </motion.button>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-2xl font-semibold text-stone-800 mb-4"
          >
            {t.sentenceTranslationQuiz}
          </motion.h2>
          <div className="flex items-center justify-center gap-2">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-stone-700 mb-6"
            >
              {quizData.original_sentence}
            </motion.p>
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); speakText(quizData.original_sentence) }}
              className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors mb-6"
            >
              <Volume2 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            {t.translation}
          </h3>
          <div className="p-4 border-2 border-dashed border-stone-300 rounded-lg min-h-20 flex flex-wrap gap-2 items-center bg-stone-50">
            <AnimatePresence>
              {selectedTokens.map((token, pos) => (
                <motion.div
                  key={`sel-${selectedIndices[pos]}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  className="flex items-center gap-1 bg-stone-800 text-white px-4 py-2 rounded-full text-sm font-medium"
                >
                  <span>{token}</span>
                  <motion.button
                    onClick={() => handleRemoveToken(pos)}
                    disabled={isChecked}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
            {selectedTokens.length === 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="italic text-stone-400"
              >
                {t.selectTokensHint}
              </motion.p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            {t.selectTokens}
          </h3>
          <div className="flex flex-wrap gap-3">
            {quizData.tokens.map((token, index) => (
              <motion.button
                key={`opt-${index}`}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ scale: 1.15, y: -8, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                whileTap={{ scale: 0.9, y: 2 }}
                onClick={() => handleTokenClick(index)}
                disabled={isChecked}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${selectedIndices.includes(index) ? 'bg-stone-200 text-stone-500 cursor-not-allowed' : 'bg-white text-stone-800 border-2 border-stone-200/80'}`}
              >
                {token}
              </motion.button>
            ))}
          </div>
        </div>

        {isChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`p-5 rounded-lg mb-6 ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}
          >
            <div className="flex items-center gap-3 mb-3">
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
                className="text-base text-stone-700 font-medium"
              >
                {quizData.correct_translation || (quizData.correct_tokens ? quizData.correct_tokens.join('') : '')}
              </motion.p>
            )}
            {isCorrect && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-medium mt-3 text-lg text-green-700"
              >
                🎉 翻译正确！
              </motion.p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!isChecked && (
            <motion.button
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={handleCheckAnswer}
              disabled={selectedIndices.length === 0}
              className="flex-1 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {t.checkAnswer}
            </motion.button>
          )}
          {isChecked && (
            <motion.button
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.97, y: 0 }}
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
                  继续学习
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
