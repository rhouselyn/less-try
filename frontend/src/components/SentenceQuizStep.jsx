import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Volume2, Languages } from 'lucide-react'
import { speakText } from '../utils/speech'
import { useDragSwap } from '../hooks/useDragSwap'

function SentenceQuizStep({ quizData, onNextQuestion, onBack, onComplete, loading, t, onOpenVocabList, sourceLang, onAnswer, skipListening, reviewMode, reviewIndex, wrongItemsCount }) {
  const [selectedIndices, setSelectedIndices] = useState([])
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [swapSelectPos, setSwapSelectPos] = useState(null)
  const answerBoxRef = useRef(null)
  const optionRefs = useRef({})
  const slotRefs = useRef({})
  const [flyingWord, setFlyingWord] = useState(null)
  const [returningWord, setReturningWord] = useState(null)

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((quizData?.step_in_unit ?? 0) + 1)
  const listeningCountInUnit = quizData?.listening_count_in_unit ?? 0
  const rawTotalItemsInUnit = quizData?.total_items_in_unit ?? 0
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (skipListening ? rawTotalItemsInUnit - listeningCountInUnit : rawTotalItemsInUnit)
  const maxWords = quizData?.correct_tokens?.length ?? 0

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

  const stripPunctuation = (str) => typeof str === 'string' ? str.replace(/[，。、；：！？,.:;!?]/g, '') : str
  const displayToken = (token) => typeof token === 'string' ? token.replace(/[，。、；：！？,.:;!?]/g, '') : token

  const handleInsert = useCallback((sourceType, sourceIdx, insertIdx) => {
    if (isChecked) return

    if (sourceType === 'answer') {
      setSelectedIndices(prev => {
        const next = [...prev]
        const [moved] = next.splice(sourceIdx, 1)
        const adjusted = insertIdx > sourceIdx ? insertIdx - 1 : insertIdx
        next.splice(adjusted, 0, moved)
        return next
      })
    } else if (sourceType === 'option') {
      if (selectedIndices.includes(sourceIdx)) return
      if (selectedIndices.length >= maxWords) return
      setSelectedIndices(prev => {
        const next = [...prev]
        next.splice(insertIdx, 0, sourceIdx)
        return next
      })
      speakText(displayToken(quizData.tokens[sourceIdx]), sourceLang)
    }
  }, [isChecked, selectedIndices, maxWords, quizData.tokens, sourceLang])

  const drag = useDragSwap({
    containerRef: answerBoxRef,
    onInsert: handleInsert,
    enabled: () => !isChecked,
    itemCount: selectedIndices.length,
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
    if (selectedIndices.length > 0) {
      const lastSlot = slots[slots.length - 1]
      if (lastSlot) {
        const rect = lastSlot.getBoundingClientRect()
        return { left: rect.right + 8, top: rect.top, width: rect.width }
      }
    }
    const boxRect = answerBoxRef.current.getBoundingClientRect()
    return { left: boxRect.left + 16, top: boxRect.top + 16, width: 80 }
  }, [selectedIndices.length])

  const handleTokenClick = (tokenIndex) => {
    if (isChecked) return
    if (drag.dragInfo) return
    const pos = selectedIndices.indexOf(tokenIndex)
    if (pos > -1) {
      const slotEl = slotRefs.current[pos]
      const optionEl = optionRefs.current[tokenIndex]
      if (slotEl && optionEl) {
        const slotRect = slotEl.getBoundingClientRect()
        const optionRect = optionEl.getBoundingClientRect()
        setReturningWord({
          word: displayToken(quizData.tokens[tokenIndex]),
          startX: slotRect.left,
          startY: slotRect.top,
          width: slotRect.width,
          targetX: optionRect.left,
          targetY: optionRect.top,
          targetWidth: optionRect.width,
        })
      }
      setSelectedIndices([...selectedIndices.slice(0, pos), ...selectedIndices.slice(pos + 1)])
    } else {
      if (selectedIndices.length >= maxWords) return
      const optionEl = optionRefs.current[tokenIndex]
      if (optionEl) {
        const rect = optionEl.getBoundingClientRect()
        const targetPos = getSlotPosition(selectedIndices.length)
        setFlyingWord({
          tokenIndex,
          startX: rect.left,
          startY: rect.top,
          width: rect.width,
          targetX: targetPos?.left ?? rect.left,
          targetY: targetPos?.top ?? rect.top,
          targetWidth: targetPos?.width ?? rect.width,
        })
      } else {
        setSelectedIndices([...selectedIndices, tokenIndex])
      }
      speakText(displayToken(quizData.tokens[tokenIndex]), sourceLang)
    }
  }

  const handleFlyComplete = useCallback(() => {
    if (!flyingWord) return
    setSelectedIndices(prev => [...prev, flyingWord.tokenIndex])
    setFlyingWord(null)
  }, [flyingWord])

  const handleReturnComplete = useCallback(() => {
    setReturningWord(null)
  }, [])

  const handleSelectedClick = (pos) => {
    if (isChecked) return
    if (drag.dragInfo) return
    if (swapSelectPos !== null) {
      if (swapSelectPos === pos) {
        setSwapSelectPos(null)
      } else {
        setSelectedIndices(prev => {
          const next = [...prev]
          const temp = next[swapSelectPos]
          next[swapSelectPos] = next[pos]
          next[pos] = temp
          return next
        })
        setSwapSelectPos(null)
      }
    } else {
      const tokenIdx = selectedIndices[pos]
      const slotEl = slotRefs.current[pos]
      const optionEl = optionRefs.current[tokenIdx]
      if (slotEl && optionEl) {
        const slotRect = slotEl.getBoundingClientRect()
        const optionRect = optionEl.getBoundingClientRect()
        setReturningWord({
          word: displayToken(quizData.tokens[tokenIdx]),
          startX: slotRect.left,
          startY: slotRect.top,
          width: slotRect.width,
          targetX: optionRect.left,
          targetY: optionRect.top,
          targetWidth: optionRect.width,
        })
      }
      setSelectedIndices([...selectedIndices.slice(0, pos), ...selectedIndices.slice(pos + 1)])
    }
  }

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
    setSwapSelectPos(null)
    setFlyingWord(null)
    setReturningWord(null)
    onNextQuestion()
  }

  const selectedTokens = selectedIndices.map(i => quizData.tokens[i])

  const isDragging = drag.dragInfo !== null
  const dragSourceIdx = drag.dragInfo?.sourceType === 'answer' ? drag.dragInfo.sourceIdx : -1
  const confirmedInsertIdx = drag.dragInfo?.confirmedInsertIdx ?? -1

  const renderAnswerItems = () => {
    const items = []
    let renderIdx = 0

    for (let i = 0; i < selectedIndices.length; i++) {
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
        const tokenIdx = selectedIndices[i]
        const token = quizData.tokens[tokenIdx]
        const isTokenCorrect = i < quizData.correct_tokens.length &&
          stripPunctuation(token) === stripPunctuation(quizData.correct_tokens[i])
        const isSwapSelected = swapSelectPos === i
        items.push(
          <motion.div
            key={`sel-${tokenIdx}`}
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
            onMouseDown={(e) => drag.handleMouseDown(e, 'answer', i, displayToken(token))}
            onTouchStart={(e) => drag.handleTouchStart(e, 'answer', i, displayToken(token))}
            onClick={() => handleSelectedClick(i)}
            className={`px-4 py-2 rounded-full text-sm font-medium select-none touch-none ${
              isChecked
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
            {displayToken(token)}
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
          <div ref={answerBoxRef} className="p-4 border-2 border-dashed border-stone-300 rounded-xl min-h-16 flex flex-wrap gap-2 items-start content-start bg-stone-50/50">
            <AnimatePresence>
              {renderAnswerItems()}
            </AnimatePresence>
            {selectedTokens.length === 0 && !isDragging && (
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
            {quizData.tokens.map((token, index) => {
              const isSelected = selectedIndices.includes(index)
              return (
                <motion.button
                  key={`opt-${index}`}
                  animate={{
                    opacity: isSelected ? 0 : 1,
                    scale: isSelected ? 0.85 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  whileHover={!isChecked && !isSelected ? { scale: 1.05, y: -2 } : {}}
                  whileTap={!isChecked && !isSelected ? { scale: 0.95 } : {}}
                  onClick={() => handleTokenClick(index)}
                  onMouseDown={(e) => { if (!isSelected && !isChecked) drag.handleMouseDown(e, 'option', index, displayToken(token)) }}
                  onTouchStart={(e) => { if (!isSelected && !isChecked) drag.handleTouchStart(e, 'option', index, displayToken(token)) }}
                  ref={el => { if (el) optionRefs.current[index] = el }}
                  style={{ pointerEvents: isSelected || isChecked ? 'none' : 'auto' }}
                  className={`px-4 py-2 rounded-full text-sm font-medium select-none touch-none ${
                    isSelected || isChecked
                      ? ''
                      : 'bg-white text-stone-800 border border-stone-200/80 hover:border-stone-300 hover:shadow-sm'
                  }`}
                >
                  {displayToken(token)}
                </motion.button>
              )
            })}
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
          {displayToken(quizData.tokens[flyingWord.tokenIndex])}
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

export default SentenceQuizStep
