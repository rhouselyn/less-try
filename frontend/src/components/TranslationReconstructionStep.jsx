import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Lightbulb, Languages } from 'lucide-react'
import { speakText } from '../utils/speech'
import { useDragSwap } from '../hooks/useDragSwap'

function TranslationReconstructionStep({ data, onNext, onBack, onComplete, loading, t, onOpenVocabList, exerciseIndexInUnit, totalExercisesInUnit, sentencePreview, sourceLang, onAnswer, reviewMode, reviewIndex, wrongItemsCount }) {
  const [selectedTokens, setSelectedTokens] = useState([])
  const [answerChecked, setAnswerChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [swapSelectPos, setSwapSelectPos] = useState(null)
  const answerBoxRef = useRef(null)
  const optionRefs = useRef({})
  const [flyingWord, setFlyingWord] = useState(null)

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((exerciseIndexInUnit ?? 0) + 1)
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (totalExercisesInUnit ?? 0)
  const isLastExercise = reviewMode ? (stepInUnit >= totalItemsInUnit) : (stepInUnit >= (totalExercisesInUnit ?? 10))
  const maxWords = data.original_tokens.length

  const handleInsert = useCallback((sourceType, sourceIdx, insertIdx) => {
    if (answerChecked) return

    if (sourceType === 'answer') {
      setSelectedTokens(prev => {
        const next = [...prev]
        const [moved] = next.splice(sourceIdx, 1)
        const adjusted = insertIdx > sourceIdx ? insertIdx - 1 : insertIdx
        next.splice(adjusted, 0, moved)
        return next
      })
    } else if (sourceType === 'option') {
      const token = data.options[sourceIdx]
      if (selectedTokens.some(t => t.index === sourceIdx)) return
      if (selectedTokens.length >= maxWords) return
      setSelectedTokens(prev => {
        const next = [...prev]
        next.splice(insertIdx, 0, { token, index: sourceIdx })
        return next
      })
      speakText(token, sourceLang)
    }
  }, [answerChecked, data.options, selectedTokens, maxWords, sourceLang])

  const drag = useDragSwap({
    containerRef: answerBoxRef,
    onInsert: handleInsert,
    enabled: () => !answerChecked,
    itemCount: selectedTokens.length,
  })

  const handleTokenSelect = (token, index) => {
    if (answerChecked) return
    if (drag.dragInfo) return
    if (selectedTokens.some(t => t.index === index)) return
    if (selectedTokens.length >= maxWords) return

    const optionEl = optionRefs.current[index]
    if (optionEl) {
      const rect = optionEl.getBoundingClientRect()
      setFlyingWord({
        token,
        index,
        startX: rect.left,
        startY: rect.top,
        width: rect.width,
        height: rect.height,
      })
    } else {
      setSelectedTokens(prev => [...prev, { token, index }])
    }
    speakText(token, sourceLang)
  }

  const handleFlyComplete = useCallback(() => {
    if (!flyingWord) return
    setSelectedTokens(prev => [...prev, { token: flyingWord.token, index: flyingWord.index }])
    setFlyingWord(null)
  }, [flyingWord])

  const handleSelectedClick = (idx) => {
    if (answerChecked) return
    if (drag.dragInfo) return
    if (swapSelectPos !== null) {
      if (swapSelectPos === idx) {
        setSwapSelectPos(null)
      } else {
        setSelectedTokens(prev => {
          const next = [...prev]
          const temp = next[swapSelectPos]
          next[swapSelectPos] = next[idx]
          next[idx] = temp
          return next
        })
        setSwapSelectPos(null)
      }
    } else {
      const newSelected = [...selectedTokens]
      newSelected.splice(idx, 1)
      setSelectedTokens(newSelected)
    }
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
    setSwapSelectPos(null)
    setFlyingWord(null)
    onNext()
  }

  const isDragging = drag.dragInfo !== null
  const dragSourceIdx = drag.dragInfo?.sourceType === 'answer' ? drag.dragInfo.sourceIdx : -1
  const insertIdx = drag.dragInfo?.insertIdx ?? -1

  const renderAnswerItems = () => {
    const items = []
    let renderIdx = 0

    for (let i = 0; i < selectedTokens.length; i++) {
      const isDragSource = isDragging && i === dragSourceIdx

      if (renderIdx === insertIdx && isDragging && !isDragSource) {
        items.push(
          <motion.div
            key="gap-indicator"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 80, opacity: 0.6 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="h-9 border-2 border-dashed border-amber-300 rounded-full bg-amber-50 flex-shrink-0"
          />
        )
      }

      if (isDragSource) {
        items.push(
          <div
            key={`placeholder-${i}`}
            className="rounded-full flex-shrink-0"
            style={{ width: 80, height: 36, opacity: 0.15, backgroundColor: '#d6d3d1' }}
          />
        )
      } else {
        const item = selectedTokens[i]
        const isTokenCorrect = i < data.original_tokens.length &&
          stripPunctuation(item.token.toLowerCase()) === stripPunctuation(data.original_tokens[i].toLowerCase())
        const isSwapSelected = swapSelectPos === i
        items.push(
          <motion.div
            key={`sel-${item.index}-${i}`}
            data-slot-idx={renderIdx}
            layout="position"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{
              layout: { type: 'spring', stiffness: 350, damping: 30 },
              opacity: { duration: 0.15 },
              scale: { type: 'spring', stiffness: 500, damping: 30 },
            }}
            onMouseDown={(e) => drag.handleMouseDown(e, 'answer', i, item.token)}
            onTouchStart={(e) => drag.handleTouchStart(e, 'answer', i, item.token)}
            onClick={() => handleSelectedClick(i)}
            className={`px-4 py-2 rounded-full text-sm font-medium select-none touch-none ${
              answerChecked
                ? isCorrect
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : isTokenCorrect
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                : isSwapSelected
                  ? 'bg-amber-100 text-amber-800 border-2 border-amber-400 cursor-pointer shadow-sm'
                  : 'bg-stone-800 text-white cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md'
            }`}
          >
            {item.token}
          </motion.div>
        )
      }

      renderIdx++
    }

    if (renderIdx === insertIdx && isDragging) {
      items.push(
        <motion.div
          key="gap-indicator-end"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 80, opacity: 0.6 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="h-9 border-2 border-dashed border-amber-300 rounded-full bg-amber-50 flex-shrink-0"
        />
      )
    }

    return items
  }

  const answerBoxTop = answerBoxRef.current?.getBoundingClientRect().top ?? 0

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
          <div ref={answerBoxRef} className="p-4 border-2 border-dashed border-stone-300 rounded-xl min-h-16 flex flex-wrap gap-2 items-start content-start bg-stone-50/50">
            <AnimatePresence>
              {renderAnswerItems()}
            </AnimatePresence>
            {selectedTokens.length === 0 && !isDragging && (
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
                  animate={{
                    opacity: isSelected ? 0 : 1,
                    scale: isSelected ? 0.85 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  whileHover={!answerChecked && !isSelected ? { scale: 1.05, y: -2 } : {}}
                  whileTap={!answerChecked && !isSelected ? { scale: 0.95 } : {}}
                  onClick={() => handleTokenSelect(token, idx)}
                  onMouseDown={(e) => { if (!isSelected && !answerChecked) drag.handleMouseDown(e, 'option', idx, token) }}
                  onTouchStart={(e) => { if (!isSelected && !answerChecked) drag.handleTouchStart(e, 'option', idx, token) }}
                  ref={el => { if (el) optionRefs.current[idx] = el }}
                  style={{ pointerEvents: isSelected || answerChecked ? 'none' : 'auto' }}
                  className={`px-4 py-2 rounded-full text-sm font-medium select-none touch-none ${
                    isSelected || answerChecked
                      ? ''
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

      {drag.dragInfo && createPortal(
        <div
          style={{
            position: 'fixed',
            left: drag.dragInfo.ghostX,
            top: drag.dragInfo.ghostY,
            width: drag.dragInfo.width,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="px-4 py-2 rounded-full text-sm font-medium bg-stone-800 text-white shadow-xl ring-2 ring-amber-400/50"
        >
          {drag.dragInfo.word}
        </div>,
        document.body
      )}

      {flyingWord && createPortal(
        <motion.div
          initial={{
            position: 'fixed',
            left: flyingWord.startX,
            top: flyingWord.startY,
            width: flyingWord.width,
            scale: 1,
          }}
          animate={{
            top: answerBoxTop + 16,
            scale: 0.95,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onAnimationComplete={handleFlyComplete}
          className="px-4 py-2 rounded-full text-sm font-medium bg-stone-800 text-white shadow-xl z-50 pointer-events-none"
        >
          {flyingWord.token}
        </motion.div>,
        document.body
      )}
    </motion.div>
  )
}

export default TranslationReconstructionStep
