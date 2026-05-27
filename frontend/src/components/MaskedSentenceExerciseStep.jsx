import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Lightbulb, PenLine } from 'lucide-react'
import { speakText } from '../utils/speech'
import { useDragSwap } from '../hooks/useDragSwap'

function MaskedSentenceExerciseStep({ data, onNext, onBack, onComplete, loading, t, onOpenVocabList, maskVersion, totalMasks, exerciseIndexInUnit, totalExercisesInUnit, sentencePreview, sourceLang, onAnswer, reviewMode, reviewIndex, wrongItemsCount }) {
  const [selectedWords, setSelectedWords] = useState([])
  const [answerChecked, setAnswerChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [swapSelectIdx, setSwapSelectIdx] = useState(null)
  const answerBoxRef = useRef(null)
  const optionRefs = useRef({})
  const slotRefs = useRef({})
  const [flyingWord, setFlyingWord] = useState(null)
  const [returningWord, setReturningWord] = useState(null)

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((exerciseIndexInUnit ?? 0) + 1)
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (totalExercisesInUnit ?? 0)
  const isLastExercise = reviewMode ? (stepInUnit >= totalItemsInUnit) : (stepInUnit >= (totalExercisesInUnit ?? 10))
  const maxWords = data.answer_words.length

  const handleInsert = useCallback((sourceType, sourceIdx, insertIdx) => {
    if (answerChecked) return

    if (sourceType === 'answer') {
      setSelectedWords(prev => {
        const next = [...prev]
        const [moved] = next.splice(sourceIdx, 1)
        const adjusted = insertIdx > sourceIdx ? insertIdx - 1 : insertIdx
        next.splice(adjusted, 0, moved)
        return next
      })
    } else if (sourceType === 'option') {
      const word = data.options[sourceIdx]
      if (selectedWords.some(w => w.index === sourceIdx)) return
      if (selectedWords.length >= maxWords) return
      setSelectedWords(prev => {
        const next = [...prev]
        next.splice(insertIdx, 0, { word, index: sourceIdx })
        return next
      })
      speakText(word, sourceLang)
    }
  }, [answerChecked, data.options, selectedWords, maxWords, sourceLang])

  const drag = useDragSwap({
    containerRef: answerBoxRef,
    onInsert: handleInsert,
    enabled: () => !answerChecked,
    itemCount: selectedWords.length,
  })

  const getSlotPosition = useCallback((targetIdx) => {
    if (!answerBoxRef.current) return null
    const slots = answerBoxRef.current.querySelectorAll('[data-slot-idx]')
    for (const slot of slots) {
      const idx = parseInt(slot.getAttribute('data-slot-idx'), 10)
      if (idx === targetIdx) {
        const rect = slot.getBoundingClientRect()
        return { left: rect.left, top: rect.top, width: rect.width }
      }
    }
    if (selectedWords.length > 0) {
      const lastSlot = slots[slots.length - 1]
      if (lastSlot) {
        const rect = lastSlot.getBoundingClientRect()
        return { left: rect.right + 8, top: rect.top, width: rect.width }
      }
    }
    const boxRect = answerBoxRef.current.getBoundingClientRect()
    return { left: boxRect.left + 16, top: boxRect.top + 16, width: 80 }
  }, [selectedWords.length])

  const handleWordSelect = (word, index) => {
    if (answerChecked) return
    if (selectedWords.length >= maxWords) return
    if (selectedWords.some(w => w.index === index)) return

    const optionEl = optionRefs.current[index]
    if (optionEl) {
      const rect = optionEl.getBoundingClientRect()
      const targetPos = getSlotPosition(selectedWords.length)
      setFlyingWord({
        word,
        index,
        startX: rect.left,
        startY: rect.top,
        width: rect.width,
        targetX: targetPos?.left ?? rect.left,
        targetY: targetPos?.top ?? rect.top,
        targetWidth: targetPos?.width ?? rect.width,
      })
    } else {
      setSelectedWords(prev => [...prev, { word, index }])
    }
    speakText(word, sourceLang)
  }

  const handleFlyComplete = useCallback(() => {
    if (!flyingWord) return
    setSelectedWords(prev => [...prev, { word: flyingWord.word, index: flyingWord.index }])
    setFlyingWord(null)
  }, [flyingWord])

  const handleSelectedClick = (pos) => {
    if (answerChecked) return
    if (drag.dragInfo) return
    if (swapSelectIdx !== null) {
      if (swapSelectIdx === pos) {
        setSwapSelectIdx(null)
      } else {
        setSelectedWords(prev => {
          const next = [...prev]
          const temp = next[swapSelectIdx]
          next[swapSelectIdx] = next[pos]
          next[pos] = temp
          return next
        })
        setSwapSelectIdx(null)
      }
    } else {
      const removed = selectedWords[pos]
      const slotEl = slotRefs.current[pos]
      const optionEl = optionRefs.current[removed.index]
      if (slotEl && optionEl) {
        const slotRect = slotEl.getBoundingClientRect()
        const optionRect = optionEl.getBoundingClientRect()
        setReturningWord({
          word: removed.word,
          startX: slotRect.left,
          startY: slotRect.top,
          width: slotRect.width,
          targetX: optionRect.left,
          targetY: optionRect.top,
          targetWidth: optionRect.width,
        })
      }
      setSelectedWords(prev => prev.filter((_, i) => i !== pos))
    }
  }

  const handleReturnComplete = useCallback(() => {
    setReturningWord(null)
  }, [])

  const checkAnswer = () => {
    const userAnswerWords = selectedWords.map(w => w.word.toLowerCase())
    const correctAnswerWords = data.answer_words.map(w => w.toLowerCase())

    const correct = userAnswerWords.length === correctAnswerWords.length &&
      userAnswerWords.every((word, index) => word === correctAnswerWords[index])

    setIsCorrect(correct)
    setAnswerChecked(true)
    if (onAnswer) onAnswer(correct)
  }

  const handleNext = () => {
    setSelectedWords([])
    setAnswerChecked(false)
    setIsCorrect(false)
    setSwapSelectIdx(null)
    setFlyingWord(null)
    setReturningWord(null)
    onNext()
  }

  const isDragging = drag.dragInfo !== null
  const dragSourceIdx = drag.dragInfo?.sourceType === 'answer' ? drag.dragInfo.sourceIdx : -1
  const confirmedInsertIdx = drag.dragInfo?.confirmedInsertIdx ?? -1

  const renderAnswerItems = () => {
    const items = []
    let renderIdx = 0

    for (let i = 0; i < selectedWords.length; i++) {
      const isDragSource = isDragging && i === dragSourceIdx

      if (renderIdx === confirmedInsertIdx && isDragging && !isDragSource) {
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
        const item = selectedWords[i]
        const isSwapSelected = swapSelectIdx === i
        items.push(
          <motion.div
            key={`slot-${item.index}`}
            ref={el => { if (el) slotRefs.current[i] = el }}
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
            onMouseDown={(e) => drag.handleMouseDown(e, 'answer', i, item.word)}
            onTouchStart={(e) => drag.handleTouchStart(e, 'answer', i, item.word)}
            onClick={() => handleSelectedClick(i)}
            className={`px-4 py-2 rounded-full text-sm font-medium select-none touch-none ${
              answerChecked
                ? isCorrect
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : (() => {
                      const correctWord = data.answer_words[i]
                      return correctWord && item.word.toLowerCase() === correctWord.toLowerCase()
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    })()
                : isSwapSelected
                  ? 'bg-amber-100 text-amber-800 border-2 border-amber-400 cursor-pointer shadow-sm'
                  : 'bg-stone-800 text-white cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md'
            }`}
          >
            {item.word}
          </motion.div>
        )
      }

      renderIdx++
    }

    if (renderIdx === confirmedInsertIdx && isDragging) {
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
            <PenLine className="w-4 h-4" />
            {t.maskedSentenceTitle || '选词填空'}
          </motion.div>
          <div className="flex items-center justify-center gap-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-stone-700"
            >
              {data.masked_sentence}
            </motion.p>
          </div>
        </div>

        <div className="mb-8">
          <div ref={answerBoxRef} className="p-4 border-2 border-dashed border-stone-300 rounded-xl min-h-16 flex flex-wrap gap-2 items-start content-start bg-stone-50/50">
            <AnimatePresence>
              {renderAnswerItems()}
            </AnimatePresence>
            {selectedWords.length === 0 && !answerChecked && !isDragging && (
              <span className="text-stone-300 text-sm">点击下方选项填入...</span>
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => speakText(data.original_sentence || data.masked_sentence?.replace(/___/g, ''), sourceLang)}
              className="ml-auto p-2 text-amber-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
              title={t.playHint || '播放提示'}
            >
              <Lightbulb className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {data.options.map((word, idx) => {
              const isSelected = selectedWords.some(w => w.index === idx)
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
                  onClick={() => handleWordSelect(word, idx)}
                  onMouseDown={(e) => { if (!isSelected && !answerChecked) drag.handleMouseDown(e, 'option', idx, word) }}
                  onTouchStart={(e) => { if (!isSelected && !answerChecked) drag.handleTouchStart(e, 'option', idx, word) }}
                  ref={el => { if (el) optionRefs.current[idx] = el }}
                  style={{ pointerEvents: isSelected || answerChecked ? 'none' : 'auto' }}
                  className={`px-4 py-2 rounded-full text-sm font-medium select-none touch-none ${
                    isSelected || answerChecked
                      ? ''
                      : 'bg-white text-stone-800 border border-stone-200/80 hover:border-stone-300 hover:shadow-sm'
                  }`}
                >
                  {word}
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
                {t.correctAnswer || '正确答案'}：{data.answer_words.join(' ')}
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
              disabled={selectedWords.length === 0}
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
            left: flyingWord.targetX,
            top: flyingWord.targetY,
            width: flyingWord.targetWidth,
            scale: 0.95,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onAnimationComplete={handleFlyComplete}
          className="px-4 py-2 rounded-full text-sm font-medium bg-stone-800 text-white shadow-xl z-50 pointer-events-none"
        >
          {flyingWord.word}
        </motion.div>,
        document.body
      )}

      {returningWord && createPortal(
        <motion.div
          initial={{
            position: 'fixed',
            left: returningWord.startX,
            top: returningWord.startY,
            width: returningWord.width,
            scale: 0.95,
          }}
          animate={{
            left: returningWord.targetX,
            top: returningWord.targetY,
            width: returningWord.targetWidth,
            scale: 1,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onAnimationComplete={handleReturnComplete}
          className="px-4 py-2 rounded-full text-sm font-medium bg-white text-stone-800 border border-stone-200/80 shadow-xl z-50 pointer-events-none"
        >
          {returningWord.word}
        </motion.div>,
        document.body
      )}
    </motion.div>
  )
}

export default MaskedSentenceExerciseStep
