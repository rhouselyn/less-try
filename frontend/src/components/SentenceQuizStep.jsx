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
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-b0aea5" />
          <p className="text-lg text-b0aea5">{t.loading}</p>
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

  const handleRemoveToken = (index) => {
    if (!isChecked) {
      setSelectedTokens([...selectedTokens.slice(0, index), ...selectedTokens.slice(index + 1)])
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
        className="flex items-center gap-2 px-4 py-2 text-b0aea5 hover:text-141413 transition-colors rounded-md hover:bg-e8e6dc mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.backToVocab}
      </motion.button>

      <div className="bg-faf9f5 border border-e8e6dc rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-semibold text-141413 mb-4"
            style={{ fontFamily: 'Poppins, Arial, sans-serif' }}
          >
            {t.sentenceTranslationQuiz}
          </motion.h2>
          <p className="text-lg text-141413 mb-6"
            style={{ fontFamily: 'Lora, Georgia, serif' }}
          >
            {quizData.original_sentence}
          </p>
        </div>

        {/* 翻译输入区 - 下方 */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-b0aea5 uppercase tracking-wider mb-3"
            style={{ fontFamily: 'Poppins, Arial, sans-serif' }}
          >
            {t.translation}
          </h3>
          <div className="p-4 border border-e8e6dc rounded-lg min-h-20 flex flex-wrap gap-2 items-center bg-white">
            <AnimatePresence>
              {selectedTokens.map((token, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1 bg-141413 text-faf9f5 px-3 py-1.5 rounded-full text-sm font-medium"
                >
                  <span>{token}</span>
                  <button
                    onClick={() => handleRemoveToken(index)}
                    disabled={isChecked}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {selectedTokens.length === 0 && (
              <p className="text-b0aea5 italic"
                style={{ fontFamily: 'Lora, Georgia, serif' }}
              >{t.selectTokensHint}</p>
            )}
          </div>
        </div>

        {/* 选项区 - 上方 */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-b0aea5 uppercase tracking-wider mb-3"
            style={{ fontFamily: 'Poppins, Arial, sans-serif' }}
          >
            {t.selectTokens}
          </h3>
          <div className="flex flex-wrap gap-2">
            {quizData.tokens.map((token, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTokenClick(token)}
                disabled={isChecked}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedTokens.includes(token) ? 'bg-e8e6dc text-b0aea5 cursor-not-allowed' : 'bg-white text-141413 hover:bg-e8e6dc'}`}
              >
                {token}
              </motion.button>
            ))}
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
                <CheckCircle2 className="w-5 h-5 text-788c5d" />
              ) : (
                <XCircle className="w-5 h-5 text-d97757" />
              )}
              <span className="font-medium" style={{ fontFamily: 'Poppins, Arial, sans-serif' }}>
                {isCorrect ? t.correct : t.incorrect}
              </span>
            </div>
            {!isCorrect && (
              <p className="text-141413" style={{ fontFamily: 'Lora, Georgia, serif' }}>
                {quizData.correct_tokens ? quizData.correct_tokens.join('') : quizData.correct_translation}
              </p>
            )}
            {isCorrect && quizData.unit_completed && (
              <p className="text-788c5d font-medium mt-2" style={{ fontFamily: 'Poppins, Arial, sans-serif' }}>
                🎉 该单元学习已完成！
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!isChecked && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleCheckAnswer}
              disabled={selectedTokens.length === 0}
              className="flex-1 py-3 bg-141413 text-faf9f5 font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ fontFamily: 'Poppins, Arial, sans-serif' }}
            >
              {t.checkAnswer}
            </motion.button>
          )}
          {isChecked && (
            <>
              {!quizData.unit_completed && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleNextQuestion}
                  disabled={loading}
                  className="flex-1 py-3 bg-141413 text-faf9f5 font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Poppins, Arial, sans-serif' }}
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
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setSelectedTokens([]);
                  setIsChecked(false);
                  setIsCorrect(false);
                  if (quizData.unit_completed) {
                    // 如果单元已完成，返回进度页面
                    onComplete();
                  } else {
                    handleNextQuestion();
                  }
                }}
                disabled={loading}
                className={`flex-1 py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  quizData.unit_completed 
                    ? 'bg-141413 text-faf9f5 hover:bg-slate-800' 
                    : 'bg-e8e6dc text-141413 hover:bg-slate-300'
                }`}
                style={{ fontFamily: 'Poppins, Arial, sans-serif' }}
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
      </div>
    </motion.div>
  )
}

export default SentenceQuizStep