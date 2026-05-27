import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Volume2, Languages } from 'lucide-react'
import { speakText } from '../utils/speech'
import { useTouchDragSwap } from '../hooks/useTouchDragSwap'

function SentenceQuizStep({ quizData, onNextQuestion, onBack, onComplete, loading, t, onOpenVocabList, sourceLang, onAnswer, skipListening, reviewMode, reviewIndex, wrongItemsCount }) {
  const [selectedIndices, setSelectedIndices] = useState([])
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [dragOverPos, setDragOverPos] = useState(null)
  const [swapSelectPos, setSwapSelectPos] = useState(null)
  const dragPosRef = useRef(null)
  const answerBoxRef = useRef(null)

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((quizData?.step_in_unit ?? 0) + 1)
  const listeningCountInUnit = quizData?.listening_count_in_unit ?? 0
  const rawTotalItemsInUnit = quizData?.total_items_in_unit ?? 0
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (skipListening ? rawTotalItemsInUnit - listeningCountInUnit : rawTotalItemsInUnit)

  const autoSpeak = useCallback(() => {
    if (quizData?.original_sentence) {
      setTimeout(() => speakText(quizData.original_sentence, sourceLang), 300)
    }
  }, [quizData?.original_sentence, sourceLang])

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

  const swapPositions = useCallback((posA, posB) => {
    if (posA === posB) return
    setSelectedIndices(prev => {
      const next = [...prev]
      const temp = next[posA]
      next[posA] = next[posB]
      next[posB] = temp
      return next
    })
  }, [])

  const getItemAtPoint = useCallback((x, y) => {
    if (!answerBoxRef.current) return null
    const slots = answerBoxRef.current.querySelectorAll('[data-slot-pos]')
    for (const slot of slots) {
      const rect = slot.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const pos = parseInt(slot.getAttribute('data-slot-pos'), 10)
        if (!isNaN(pos)) return pos
      }
    }
    return null
  }, [])

  const touchDrag = useTouchDragSwap({
    getItemAtPoint,
    onSwap: swapPositions,
    enabled: () => !isChecked,
  })

  const handleSelectedClick = (pos) => {
    if (isChecked) return
    if (swapSelectPos !== null) {
      if (swapSelectPos === pos) {
        setSwapSelectPos(null)
      } else {
        swapPositions(swapSelectPos, pos)
        setSwapSelectPos(null)
      }
    } else {
      handleRemoveToken(pos)
    }
  }

  const handleSelectedDragStart = (e, pos) => {
    if (isChecked) return
    dragPosRef.current = pos
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(pos))
  }

  const handleSelectedDragOver = (e, pos) => {
    e.preventDefault()
    setDragOverPos(pos)
  }

  const handleSelectedDragLeave = () => {
    setDragOverPos(null)
  }

  const handleSelectedDrop = (e, targetPos) => {
    e.preventDefault()
    setDragOverPos(null)
    const sourcePos = dragPosRef.current
    if (sourcePos === null || sourcePos === targetPos) return
    swapPositions(sourcePos, targetPos)
    dragPosRef.current = null
  }

  const handleSelectedDragEnd = () => {
    dragPosRef.current = null
    setDragOverPos(null)
  }

  const stripPunctuation = (str) => typeof str === 'string' ? str.replace(/[，。、；：！？,.:;!?]/g, '') : str

  const displayToken = (token) => typeof token === 'string' ? token.replace(/[，。、；：！？,.:;!?]/g, '') : token

  const handleCheckAnswer = () => {
    const userTokens = selectedIndices.map(i => stripPunctuation(quizData.tokens[i]))
    const correctTokens = quizData.correct_tokens.map(t => stripPunctuation(t))
    const isCorrectAnswer = JSON.stringify(userTokens) === JSON.stringify(correctTokens)
    setIsCorrect(isCorrectAnswer)
    setIsChecked(true)
    if (onAnswer) onAnswer(isCorrectAnswer)
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <motion.button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors rounded-md hover:bg-stone-100"
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          {totalItemsInUnit > 0 && (
            <span className="text-sm text-stone-500 font-medium">{(t.stepProgress || '第 {0} / {1} 题').replace('{0}', stepInUnit).replace('{1}', totalItemsInUnit)}</span>
          )}
          {onOpenVocabList && (
            <motion.button
              onClick={onOpenVocabList}
              className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors rounded-md hover:bg-stone-100"
              whileHover={{ scale: 1.05, x: 2 }}
              whileTap={{ scale: 0.95 }}
            >
              <BookOpen className="w-4 h-4" />
              {t.vocabList || '单词表'}
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium mb-4"
          >
            <Languages className="w-4 h-4" />
            {t.translationQuiz || '翻译题'}
          </motion.div>
          <div className="flex items-center justify-center gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-stone-700"
            >
              {quizData.original_sentence}
            </motion.p>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); speakText(quizData.original_sentence, sourceLang) }}
              className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
            >
              <Volume2 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="mb-8">
          <div ref={answerBoxRef} className="p-4 border-2 border-dashed border-stone-300 rounded-xl min-h-16 flex flex-wrap gap-2 items-center bg-stone-50/50">
            <AnimatePresence>
              {selectedTokens.map((token, pos) => {
                const isTokenCorrect = pos < quizData.correct_tokens.length &&
                  stripPunctuation(token) === stripPunctuation(quizData.correct_tokens[pos])
                const isDragOver = dragOverPos === pos
                const isSwapSelected = swapSelectPos === pos
                return (
                  <motion.div
                    key={`sel-${selectedIndices[pos]}`}
                    data-slot-pos={pos}
                    layout
                    layoutId={`quiz-token-${selectedIndices[pos]}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    draggable={!isChecked}
                    onDragStart={(e) => handleSelectedDragStart(e, pos)}
                    onDragOver={(e) => handleSelectedDragOver(e, pos)}
                    onDragLeave={handleSelectedDragLeave}
                    onDrop={(e) => handleSelectedDrop(e, pos)}
                    onDragEnd={handleSelectedDragEnd}
                    onTouchStart={!isChecked ? (e) => touchDrag.handleTouchStart(e, pos) : undefined}
                    onTouchMove={!isChecked ? touchDrag.handleTouchMove : undefined}
                    onTouchEnd={!isChecked ? touchDrag.handleTouchEnd : undefined}
                    onClick={() => handleSelectedClick(pos)}
                    className={`px-4 py-2 rounded-full text-sm font-medium select-none ${
                      isChecked
                        ? isCorrect
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : isTokenCorrect
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        : isDragOver
                          ? 'bg-amber-100 text-amber-800 border-2 border-amber-400 cursor-grab'
                          : isSwapSelected
                            ? 'bg-amber-100 text-amber-800 border-2 border-amber-400 cursor-pointer'
                            : 'bg-stone-800 text-white cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    <span>{displayToken(token)}</span>
                  </motion.div>
                )
              })}
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
          <div className="flex flex-wrap gap-3">
            {quizData.tokens.map((token, index) => (
              <motion.button
                key={`opt-${index}`}
                layoutId={`quiz-token-${index}`}
                whileHover={!isChecked && !selectedIndices.includes(index) ? { scale: 1.05 } : {}}
                whileTap={!isChecked && !selectedIndices.includes(index) ? { scale: 0.95 } : {}}
                onClick={() => handleTokenClick(index)}
                disabled={selectedIndices.includes(index) || isChecked}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedIndices.includes(index) || isChecked
                    ? 'opacity-0 pointer-events-none h-0 py-0 overflow-hidden border-0 min-w-0'
                    : 'bg-white text-stone-800 border border-stone-200/80 hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                {displayToken(token)}
              </motion.button>
            ))}
          </div>
        </div>

        {isChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`p-5 rounded-xl mb-6 ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
              <span className={`font-semibold text-lg ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>{isCorrect ? t.correct : t.incorrect}</span>
            </div>
            {!isCorrect && (
              <p className="text-stone-700 font-medium">
                {t.correctAnswer || '正确答案'}：{quizData.correct_translation || (quizData.correct_tokens ? quizData.correct_tokens.join('') : '')}
              </p>
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
              className="flex-1 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
