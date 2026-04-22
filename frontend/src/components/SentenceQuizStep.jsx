import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, X } from 'lucide-react'

function SentenceQuizStep({ quizData, onNextQuestion, onBack, onComplete, loading, t, onOpenVocabList }) {
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
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-600">{t.loading}</p>
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
      <div className="flex justify-between items-center mb-8">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-100"
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t.backToVocab}
        </motion.button>
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onOpenVocabList}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-100"
          whileHover={{ scale: 1.05, x: 2 }}
          whileTap={{ scale: 0.95 }}
        >
          📚 单词表
        </motion.button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-2xl font-semibold text-gray-900 mb-4"
          >
            {t.sentenceTranslationQuiz}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-800 mb-6"
          >
            {quizData.original_sentence}
          </motion.p>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t.translation}
          </h3>
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg min-h-20 flex flex-wrap gap-2 items-center bg-gray-50">
            <AnimatePresence>
              {selectedTokens.map((token, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  className="flex items-center gap-1 bg-black text-white px-4 py-2 rounded-full text-sm font-medium"
                >
                  <span>{token}</span>
                  <motion.button
                    onClick={() => handleRemoveToken(index)}
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
                className="italic text-gray-400"
              >
                {t.selectTokensHint}
              </motion.p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t.selectTokens}
          </h3>
          <div className="flex flex-wrap gap-3">
            {quizData.tokens.map((token, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ scale: 1.15, y: -8, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                whileTap={{ scale: 0.9, y: 2 }}
                onClick={() => handleTokenClick(token)}
                disabled={isChecked}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${selectedTokens.includes(token) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900 border-2 border-gray-200'}`}
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
                className="text-base text-gray-800 font-medium"
              >
                {quizData.correct_tokens ? quizData.correct_tokens.join('') : quizData.correct_translation}
              </motion.p>
            )}
            {isCorrect && quizData.unit_completed && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-medium mt-3 text-lg text-green-700"
              >
                🎉 该单元学习已完成！
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
              disabled={selectedTokens.length === 0}
              className="flex-1 py-4 bg-black text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {t.checkAnswer}
            </motion.button>
          )}
          {isChecked && (
            <>
              {!quizData.unit_completed && (
                <motion.button
                  whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
                  whileTap={{ scale: 0.97, y: 0 }}
                  onClick={handleNextQuestion}
                  disabled={loading}
                  className="flex-1 py-4 bg-gray-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.loading}
                    </>
                  ) : (
                    <>
                      {t.continue}
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
                whileTap={{ scale: 0.97, y: 0 }}
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
                className={`flex-1 py-4 font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${quizData.unit_completed ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.loading}
                  </>
                ) : (
                  quizData.unit_completed ? '完成' : '下一题'
                )}
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default SentenceQuizStep