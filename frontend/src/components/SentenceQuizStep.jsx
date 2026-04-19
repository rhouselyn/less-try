import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, X } from 'lucide-react'

function SentenceQuizStep({ quizData, onNextQuestion, onBack, onComplete, loading, t }) {
  const [selectedTokens, setSelectedTokens] = useState([])
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  if (!quizData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-500" />
          <p className="text-lg text-indigo-900">{t.loading}</p>
        </div>
      </motion.div>
    )
  }

  const handleTokenClick = (token) => {
    if (!isChecked) {
      const index = selectedTokens.indexOf(token)
      if (index > -1) {
        setSelectedTokens([...selectedTokens.slice(0, index), ...selectedTokens.slice(index + 1)])
      } else {
        setSelectedTokens([...selectedTokens, token])
      }
    }
  }

  const handleRemoveToken = (index) => {
    if (!isChecked) {
      setSelectedTokens([...selectedTokens.slice(0, index), ...selectedTokens.slice(index + 1)])
    }
  }

  const handleCheckAnswer = () => {
    const isCorrectAnswer = JSON.stringify(selectedTokens) === JSON.stringify(quizData.correct_tokens)
    setIsCorrect(isCorrectAnswer)
    setIsChecked(true)
  }

  const handleNextQuestion = () => {
    setSelectedTokens([])
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
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 transition-colors rounded-md hover:bg-indigo-50 mb-8"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <ArrowLeft className="w-4 h-4" />
        {t.backToVocab}
      </motion.button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-8 shadow-lg"
        style={{ 
          backgroundColor: 'white', 
          border: '2px solid #e0e7ff' 
        }}
      >
        <div className="text-center mb-8">
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold mb-4 text-indigo-900"
          >
            {t.sentenceTranslationQuiz}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl mb-6 text-gray-800 font-medium"
          >
            {quizData.original_sentence}
          </motion.p>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-indigo-700">
            {t.translation}
          </h3>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="p-5 rounded-xl min-h-24 flex flex-wrap gap-3 items-center"
            style={{ 
              border: '2px dashed #c7d2fe', 
              backgroundColor: '#f8faff' 
            }}
          >
            <AnimatePresence>
              {selectedTokens.map((token, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 5 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-indigo-600 text-white"
                >
                  <span>{token}</span>
                  <button
                    onClick={() => handleRemoveToken(index)}
                    disabled={isChecked}
                    className="p-1 rounded-full transition-colors hover:bg-white hover:bg-opacity-20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {selectedTokens.length === 0 && (
              <p className="italic text-gray-500">{t.selectTokensHint}</p>
            )}
          </motion.div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-indigo-700">
            {t.selectTokens}
          </h3>
          <div className="flex flex-wrap gap-3">
            {quizData.tokens.map((token, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, type: 'spring', stiffness: 400, damping: 25 }}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTokenClick(token)}
                disabled={isChecked}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${selectedTokens.includes(token) ? 'cursor-not-allowed bg-indigo-100 text-indigo-500' : 'bg-white text-indigo-800 border-2 border-indigo-200 hover:bg-indigo-50'}`}
              >
                {token}
              </motion.button>
            ))}
          </div>
        </div>

        {isChecked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-xl mb-6"
            style={{
              backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `2px solid ${isCorrect ? '#10b981' : '#ef4444'}`
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              {isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <span className="font-semibold text-lg text-gray-800">
                {isCorrect ? t.correct : t.incorrect}
              </span>
            </div>
            {!isCorrect && (
              <p className="text-base text-gray-700 font-medium">
                {quizData.correct_tokens ? quizData.correct_tokens.join('') : quizData.correct_translation}
              </p>
            )}
            {isCorrect && quizData.unit_completed && (
              <p className="font-medium mt-3 text-lg text-emerald-600">
                🎉 该单元学习已完成！
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!isChecked && (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckAnswer}
              disabled={selectedTokens.length === 0}
              className="flex-1 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {t.checkAnswer}
            </motion.button>
          )}
          {isChecked && (
            <>
              {!quizData.unit_completed && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextQuestion}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.loading}
                    </>
                  ) : (
                    <>
                      {t.continue}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedTokens([]);
                  setIsChecked(false);
                  setIsCorrect(false);
                  if (quizData.unit_completed) {
                    onComplete();
                  } else {
                    handleNextQuestion();
                  }
                }}
                disabled={loading}
                className={`flex-1 py-3.5 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${quizData.unit_completed ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.loading}
                  </>
                ) : (
                  quizData.unit_completed ? '完成' : '下一题'
                )}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default SentenceQuizStep