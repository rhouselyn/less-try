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
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#b0aea5' }} />
          <p className="text-lg" style={{ color: '#6b6a61' }}>{t.loading}</p>
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
        className="flex items-center gap-2 px-4 py-2 rounded-md transition-all mb-8 hover:bg-opacity-20"
        style={{ color: '#6b6a61' }}
        whileHover={{ color: '#141413', backgroundColor: 'rgba(20, 20, 19, 0.08)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        {t.backToVocab}
      </motion.button>

      <div 
        className="rounded-2xl p-8 shadow-sm"
        style={{ 
          backgroundColor: '#faf9f5', 
          border: '1px solid #e8e6dc' 
        }}
      >
        <div className="text-center mb-8">
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-semibold mb-4"
            style={{ 
              color: '#141413', 
              fontFamily: 'Poppins, Arial, sans-serif' 
            }}
          >
            {t.sentenceTranslationQuiz}
          </motion.h2>
          <p 
            className="text-lg mb-6"
            style={{ 
              color: '#141413', 
              fontFamily: 'Lora, Georgia, serif' 
            }}
          >
            {quizData.original_sentence}
          </p>
        </div>

        <div className="mb-8">
          <h3 
            className="text-sm font-semibold uppercase tracking-wider mb-3"
            style={{ 
              color: '#b0aea5', 
              fontFamily: 'Poppins, Arial, sans-serif' 
            }}
          >
            {t.translation}
          </h3>
          <div 
            className="p-4 rounded-lg min-h-20 flex flex-wrap gap-2 items-center"
            style={{ 
              border: '2px dashed #e8e6dc', 
              backgroundColor: 'white' 
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
                  className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: '#d97757', 
                    color: 'white' 
                  }}
                >
                  <span style={{ fontFamily: 'Lora, Georgia, serif' }}>{token}</span>
                  <button
                    onClick={() => handleRemoveToken(index)}
                    disabled={isChecked}
                    className="p-1 rounded-full transition-all"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {selectedTokens.length === 0 && (
              <p 
                className="italic"
                style={{ color: '#b0aea5', fontFamily: 'Lora, Georgia, serif' }}
              >
                {t.selectTokensHint}
              </p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h3 
            className="text-sm font-semibold uppercase tracking-wider mb-3"
            style={{ 
              color: '#b0aea5', 
              fontFamily: 'Poppins, Arial, sans-serif' 
            }}
          >
            {t.selectTokens}
          </h3>
          <div className="flex flex-wrap gap-2">
            {quizData.tokens.map((token, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                whileHover={{ scale: 1.1, y: -4, rotate: 2 }}
                whileTap={{ scale: 0.92, rotate: -2 }}
                onClick={() => handleTokenClick(token)}
                disabled={isChecked}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${selectedTokens.includes(token) ? 'cursor-not-allowed' : ''}`}
                style={
                  selectedTokens.includes(token) ? 
                  { 
                    backgroundColor: '#e8e6dc', 
                    color: '#b0aea5', 
                    fontFamily: 'Lora, Georgia, serif' 
                  } : 
                  { 
                    backgroundColor: 'white', 
                    color: '#141413', 
                    border: '2px solid #e8e6dc', 
                    fontFamily: 'Lora, Georgia, serif' 
                  }
                }
                whileHover={selectedTokens.includes(token) ? {} : { backgroundColor: '#e8e6dc' }}
              >
                {token}
              </motion.button>
            ))}
          </div>
        </div>

        {isChecked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-lg mb-6"
            style={{
              backgroundColor: isCorrect ? 'rgba(120, 140, 93, 0.15)' : 'rgba(217, 119, 87, 0.15)',
              border: `2px solid ${isCorrect ? '#788c5d' : '#d97757'}`
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              {isCorrect ? (
                <CheckCircle2 className="w-6 h-6" style={{ color: '#788c5d' }} />
              ) : (
                <XCircle className="w-6 h-6" style={{ color: '#d97757' }} />
              )}
              <span 
                className="font-semibold text-lg"
                style={{ 
                  color: isCorrect ? '#788c5d' : '#d97757', 
                  fontFamily: 'Poppins, Arial, sans-serif' 
                }}
              >
                {isCorrect ? t.correct : t.incorrect}
              </span>
            </div>
            {!isCorrect && (
              <p 
                className="text-base"
                style={{ 
                  color: '#141413', 
                  fontFamily: 'Lora, Georgia, serif' 
                }}
              >
                {quizData.correct_tokens ? quizData.correct_tokens.join('') : quizData.correct_translation}
              </p>
            )}
            {isCorrect && quizData.unit_completed && (
              <p 
                className="font-medium mt-3 text-lg"
                style={{ 
                  color: '#788c5d', 
                  fontFamily: 'Poppins, Arial, sans-serif' 
                }}
              >
                🎉 该单元学习已完成！
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!isChecked && (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97, y: 1 }}
              onClick={handleCheckAnswer}
              disabled={selectedTokens.length === 0}
              className="flex-1 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              style={{ backgroundColor: '#d97757', color: 'white', fontFamily: 'Poppins, Arial, sans-serif' }}
            >
              {t.checkAnswer}
            </motion.button>
          )}
          {isChecked && (
            <>
              {!quizData.unit_completed && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.97, y: 1 }}
                  onClick={handleNextQuestion}
                  disabled={loading}
                  className="flex-1 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#6a9bcc', color: 'white', fontFamily: 'Poppins, Arial, sans-serif' }}
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
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97, y: 1 }}
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
                className={`flex-1 py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                style={
                  quizData.unit_completed ? 
                  { 
                    backgroundColor: '#788c5d', 
                    color: 'white', 
                    fontFamily: 'Poppins, Arial, sans-serif' 
                  } : 
                  { 
                    backgroundColor: '#e8e6dc', 
                    color: '#141413', 
                    fontFamily: 'Poppins, Arial, sans-serif' 
                  }
                }
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