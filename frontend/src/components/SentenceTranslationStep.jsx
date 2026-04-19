import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'

function SentenceTranslationStep({ sentences, onMarkCovered, onBack, t }) {
  const [selectedTokens, setSelectedTokens] = useState([])
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [isCorrect, setIsCorrect] = useState(null)
  
  if (!sentences || sentences.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center py-16">
          <p className="text-lg text-slate-600">没有可学习的句子</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="mt-4 px-6 py-2 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            返回进度页
          </motion.button>
        </div>
      </motion.div>
    )
  }
  
  const currentSentence = sentences[currentSentenceIndex]
  const allTokens = [
    ...currentSentence.translation.split(' '),
    ...currentSentence.distractor_tokens
  ].filter(token => token)
  
  const handleTokenSelect = (token) => {
    setSelectedTokens(prev => [...prev, token])
  }
  
  const handleSubmit = () => {
    const submittedTranslation = selectedTokens.join(' ')
    const isCorrectAnswer = submittedTranslation === currentSentence.translation
    setIsCorrect(isCorrectAnswer)
    
    if (isCorrectAnswer) {
      onMarkCovered(currentSentence.sentence_index)
    }
  }
  
  const handleNext = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1)
      setSelectedTokens([])
      setIsCorrect(null)
    } else {
      onBack()
    }
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
        返回进度页
      </motion.button>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">
          句子翻译 ({currentSentenceIndex + 1}/{sentences.length})
        </h2>
        
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">原文</h3>
          <p className="text-lg text-slate-900">{currentSentence.sentence}</p>
        </div>
        
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">你的翻译</h3>
          <div className="p-4 border border-slate-200 rounded-lg min-h-16 mb-4">
            <p className="text-lg text-slate-900">{selectedTokens.join(' ')}</p>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {allTokens.map((token, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTokenSelect(token)}
                disabled={isCorrect !== null}
                className="px-4 py-2 bg-slate-100 text-slate-900 rounded-md text-sm hover:bg-slate-200 transition-colors"
              >
                {token}
              </motion.button>
            ))}
          </div>
          
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSubmit}
              disabled={isCorrect !== null || selectedTokens.length === 0}
              className="flex-1 py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              提交
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedTokens([])}
              disabled={isCorrect !== null}
              className="px-6 py-3 bg-slate-100 text-slate-900 font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              清空
            </motion.button>
          </div>
        </div>
        
        {isCorrect !== null && (
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
              <h3 className="font-medium text-slate-900">
                {isCorrect ? '正确！' : '错误'}
              </h3>
            </div>
            {!isCorrect && (
              <p className="text-slate-700">
                正确答案: {currentSentence.translation}
              </p>
            )}
          </motion.div>
        )}
        
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleNext}
          disabled={isCorrect === null}
          className="w-full py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentSentenceIndex < sentences.length - 1 ? '下一题' : '完成'}
        </motion.button>
      </div>
    </motion.div>
  )
}

export default SentenceTranslationStep
