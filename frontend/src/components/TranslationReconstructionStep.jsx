import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Lightbulb, Languages } from 'lucide-react'
import { speakText } from '../utils/speech'
import { useTouchDragSwap } from '../hooks/useTouchDragSwap'

function TranslationReconstructionStep({ data, onNext, onBack, onComplete, loading, t, onOpenVocabList, exerciseIndexInUnit, totalExercisesInUnit, sentencePreview, sourceLang, onAnswer, reviewMode, reviewIndex, wrongItemsCount }) {
  const [selectedTokens, setSelectedTokens] = useState([])
  const [answerChecked, setAnswerChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [dragOverPos, setDragOverPos] = useState(null)
  const [swapSelectPos, setSwapSelectPos] = useState(null)
  const dragPosRef = useRef(null)
  const answerBoxRef = useRef(null)

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((exerciseIndexInUnit ?? 0) + 1)
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (totalExercisesInUnit ?? 0)
  const isLastExercise = reviewMode ? (stepInUnit >= totalItemsInUnit) : (stepInUnit >= (totalExercisesInUnit ?? 10))

  const handleTokenSelect = (token, index) => {
    if (answerChecked) return
    setSelectedTokens([...selectedTokens, { token, index }])
  }

  const handleRemoveToken = (index) => {
    if (answerChecked) return
    const newSelected = [...selectedTokens]
    newSelected.splice(index, 1)
    setSelectedTokens(newSelected)
  }

  const swapPositions = useCallback((posA, posB) => {
    if (posA === posB) return
    setSelectedTokens(prev => {
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
    enabled: () => !answerChecked,
  })

  const handleSelectedClick = (idx) => {
    if (answerChecked) return
    if (swapSelectPos !== null) {
      if (swapSelectPos === idx) {
        setSwapSelectPos(null)
      } else {
        swapPositions(swapSelectPos, idx)
        setSwapSelectPos(null)
      }
    } else {
      handleRemoveToken(idx)
    }
  }

  const handleSelectedDragStart = (e, pos) => {
    if (answerChecked) return
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

  const stripPunctuation = (str) => str.replace(/[，。、；：！？,.:;!?]/g, '')

  const checkAnswer = () => {
    const userTokens = selectedTokens.map(t => stripPunctuation(t.token.toLowerCase()))
    const correctTokens = data.original_tokens.map(t => stripPunctuation(t.toLowerCase()))

    const correct = userTokens.length === correctTokens.length &&
      userTokens.every((token, index) => token === correctTokens[index])

    setIsCorrect(correct)
    setAnswerChecked(true)
    if (onAnswer) onAnswer(correct)
  }

  const handleNext = () => {
    setSelectedTokens([])
    setAnswerChecked(false)
    setIsCorrect(false)
    onNext()
  }

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
            {t.translationReconstructionTitle || '翻译还原'}
          </motion.div>
          <div className="flex items-center justify-center gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-stone-600 italic"
            >
              {data.native_translation}
            </motion.p>
          </div>
        </div>

        <div className="mb-8">
          <div ref={answerBoxRef} className="p-4 border-2 border-dashed border-stone-300 rounded-xl min-h-16 flex flex-wrap gap-2 items-center bg-stone-50/50">
            <AnimatePresence>
              {selectedTokens.map((item, idx) => {
                const isTokenCorrect = idx < data.original_tokens.length &&
                  stripPunctuation(item.token.toLowerCase()) === stripPunctuation(data.original_tokens[idx].toLowerCase())
                const isDragOver = dragOverPos === idx
                const isSwapSelected = swapSelectPos === idx
                return (
                  <motion.div
                    key={`sel-${item.index}-${idx}`}
                    data-slot-pos={idx}
                    layout
                    layoutId={`recon-token-${item.index}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    draggable={!answerChecked}
                    onDragStart={(e) => handleSelectedDragStart(e, idx)}
                    onDragOver={(e) => handleSelectedDragOver(e, idx)}
                    onDragLeave={handleSelectedDragLeave}
                    onDrop={(e) => handleSelectedDrop(e, idx)}
                    onDragEnd={handleSelectedDragEnd}
                    onTouchStart={!answerChecked ? (e) => touchDrag.handleTouchStart(e, idx) : undefined}
                    onTouchMove={!answerChecked ? touchDrag.handleTouchMove : undefined}
                    onTouchEnd={!answerChecked ? touchDrag.handleTouchEnd : undefined}
                    onClick={() => handleSelectedClick(idx)}
                    className={`px-4 py-2 rounded-full text-sm font-medium select-none ${
                      answerChecked
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
                    {item.token}
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {selectedTokens.length === 0 && (
              <span className="italic text-stone-400 text-sm">{t.tapToReconstruct || '按顺序点击下方词语还原句子'}</span>
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => speakText(data.original_tokens?.join(' ') || '', sourceLang)}
              className="ml-auto p-2 text-amber-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
              title={t.playHint || '播放提示'}
            >
              <Lightbulb className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {data.options.map((token, idx) => {
              const isSelected = selectedTokens.some(t => t.index === idx)
              return (
                <motion.button
                  key={`opt-${idx}`}
                  layoutId={`recon-token-${idx}`}
                  whileHover={!answerChecked && !isSelected ? { scale: 1.05 } : {}}
                  whileTap={!answerChecked && !isSelected ? { scale: 0.95 } : {}}
                  onClick={() => handleTokenSelect(token, idx)}
                  disabled={isSelected || answerChecked}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected || answerChecked
                      ? 'opacity-0 pointer-events-none h-0 py-0 overflow-hidden border-0 min-w-0'
                      : 'bg-white text-stone-800 border border-stone-200/80 hover:border-stone-300 hover:shadow-sm'
                  }`}
                >
                  {token}
                </motion.button>
              )
            })}
          </div>
        </div>

        {answerChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-xl mb-6 ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
              <span className={`font-semibold text-lg ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>{isCorrect ? t.correct : t.incorrect}</span>
            </div>
            {!isCorrect && (
              <p className="text-stone-700 font-medium">
                {t.correctAnswer || '正确答案'}：{data.original_tokens.join(' ')}
              </p>
            )}
            {isCorrect && isLastExercise && (
              <p className="font-medium mt-3 text-lg text-green-700">
                🎉 {t.unitStudyComplete || '该单元学习已完成！'}
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!answerChecked ? (
            <motion.button
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={checkAnswer}
              disabled={selectedTokens.length === 0}
              className="flex-1 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={handleNext}
              disabled={loading}
              className="flex-1 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.loading}
                </>
              ) : isLastExercise ? (
                t.done || '完成'
              ) : (
                <>
                  {t.nextQuestion || '下一题'}
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

export default TranslationReconstructionStep
