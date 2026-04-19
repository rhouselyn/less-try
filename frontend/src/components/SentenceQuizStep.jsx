import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'

function SentenceQuizStep({ quizData, onNextQuestion, onBack, loading, t }) {
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
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-lg text-slate-600">{t.loading}</p>
        </div>
      </motion.div>
    )
  }

  const handleTokenClick = (token) => {
    if (!isChecked) {
      const index = selectedTokens.indexOf(token)
      if (index > -1) {
        // 如果已经选中，取消选择
        setSelectedTokens([...selectedTokens.slice(0, index), ...selectedTokens.slice(index + 1)])
      } else {
        // 如果没有选中，添加选择
        setSelectedTokens([...selectedTokens, token])
      }
    }
  }

  const handleCheckAnswer = () => {
    // 只需要token顺序匹配即可
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
      {/* 返回按钮 */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.backToVocab}
      </motion.button>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-semibold text-slate-900 mb-4"
          >
            {t.sentenceTranslationQuiz}
          </motion.h2>
          <p className="text-lg text-slate-700 mb-6">
            {quizData.original_sentence}
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.selectTokens}
          </h3>
          <div className="flex flex-wrap gap-2">
            {quizData.tokens.map((token, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTokenClick(token)}
                disabled={isChecked}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedTokens.includes(token) ? 'bg-black text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {token}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.translation}
          </h3>
          <div className="p-4 border border-slate-200 rounded-lg min-h-16">
            <p className="text-lg">{selectedTokens.join('')}</p>
          </div>
        </div>

        {isChecked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg mb-6 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">{isCorrect ? t.correct : t.incorrect}</span>
            </div>
            {!isCorrect && (
              <p className="text-slate-700">{quizData.correct_tokens ? quizData.correct_tokens.join('') : quizData.correct_translation}</p>
            )}
            {isCorrect && quizData.unit_completed && (
              <p className="text-green-600 font-medium mt-2">🎉 该单元学习已完成！</p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleCheckAnswer}
            disabled={isChecked || selectedTokens.length === 0}
            className="flex-1 py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t.checkAnswer}
          </motion.button>
          {isChecked && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleNextQuestion}
              disabled={loading}
              className="flex-1 py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.loading}
                </>
              ) : (
                <>
                  {quizData.unit_completed && isCorrect ? '完成' : t.continue}
                  <ChevronRight className="w-4 h-4" />
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