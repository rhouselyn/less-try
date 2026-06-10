import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, ChevronRight, BookOpen, Volume2, Headphones, SkipForward, Turtle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { speakText } from '../utils/speech'

function ListeningQuizStep({ quizData, onNextQuestion, onBack, loading, t, onOpenVocabList, sourceLang, onAnswer, skipListening, onSkipListeningChange, reviewMode, reviewIndex, wrongItemsCount }) {
  const [selectedWords, setSelectedWords] = useState([])
  const [isChecked, setIsChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isSkipped, setIsSkipped] = useState(false)

  const stepInUnit = reviewMode ? (reviewIndex + 1) : ((quizData?.step_in_unit ?? 0) + 1)
  const listeningCountInUnit = quizData?.listening_count_in_unit ?? 0
  const rawTotalItemsInUnit = quizData?.total_items_in_unit ?? 0
  const totalItemsInUnit = reviewMode ? (wrongItemsCount ?? 0) : (skipListening ? rawTotalItemsInUnit - listeningCountInUnit : rawTotalItemsInUnit)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [quizData?.original_sentence])

  useEffect(() => {
    if (quizData?.original_sentence) {
      const timer = setTimeout(() => speakText(quizData.clean_sentence || quizData.original_sentence, sourceLang), 300)
      return () => clearTimeout(timer)
    }
  }, [quizData?.original_sentence, sourceLang])

  if (!quizData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#7a7a9a]" />
          <p className="text-lg text-[#4a4a6a]">{t.loading}</p>
        </div>
      </motion.div>
    )
  }

  const correctWords = quizData.correct_words || []
  const options = quizData.options || []

  const stripPunct = (str) => {
    if (typeof str !== 'string') return str
    return str.replace(/^[^\w\u00C0-\u024F\u0400-\u052F\u0370-\u03FF\u0600-\u06FF\u0900-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF\u0E00-\u0E7F\u0F00-\u0FFF\uA800-\uA82F\uA840-\uA87F]+|[^\w\u00C0-\u024F\u0400-\u052F\u0370-\u03FF\u0600-\u06FF\u0900-\u0D7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF\u0E00-\u0E7F\u0F00-\u0FFF\uA800-\uA82F\uA840-\uA87F]+$/g, '')
  }

  const handleWordSelect = (word, index) => {
    if (isChecked) return
    setSelectedWords([...selectedWords, { word, index }])
  }

  const handleRemoveWord = (pos) => {
    if (isChecked) return
    const newSelected = [...selectedWords]
    newSelected.splice(pos, 1)
    setSelectedWords(newSelected)
  }

  const checkAnswer = () => {
    const stripForCompare = (s) => typeof s === 'string' ? s.replace(/[，。、；：！？,.:;!?]/g, '').toLowerCase().trim() : ''
    const userWords = selectedWords.map(w => stripForCompare(w.word))
    const correct = userWords.length === correctWords.length &&
      userWords.every((w, i) => w === stripForCompare(correctWords[i]))
    setIsCorrect(correct)
    setIsChecked(true)
    if (onAnswer) onAnswer(correct)
  }

  const handleSkipListening = () => {
    setIsSkipped(true)
    setIsCorrect(true)
    setIsChecked(true)
    if (onAnswer) onAnswer(true)
    if (onSkipListeningChange) onSkipListeningChange(true)
  }

  const handleNextQuestion = () => {
    onNextQuestion()
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
            className="flex items-center gap-2 btn-ghost"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          {totalItemsInUnit > 0 && (
            <span className="text-sm text-[#4a4a6a] font-bold">{t.step || '第'} {stepInUnit} / {totalItemsInUnit} {t.question || '题'}</span>
          )}
          {!isChecked && !isSkipped && (
            <motion.button
              onClick={handleSkipListening}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#7a7a9a] hover:text-[#ff006e] hover:bg-[#fff0f6] transition-colors"
              title={t.skipListening || '跳过听力'}
            >
              <SkipForward className="w-3.5 h-3.5" />
              {t.skip || '跳过'}
            </motion.button>
          )}
          {onOpenVocabList && (
            <motion.button
              onClick={onOpenVocabList}
              className="flex items-center gap-2 btn-ghost"
            >
              <BookOpen className="w-4 h-4" />
              {t.vocabList || '单词表'}
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-white border-[3px] border-[#1a1a2e] p-8 shadow-[2px_2px_0_#1a1a2e]">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#fff0f6] text-[#ff006e] text-sm font-bold mb-4"
          >
            <Headphones className="w-4 h-4" />
            {t.listeningQuizTitle || '听力题'}
          </motion.div>
          <div className="flex items-center justify-center gap-3">
            <motion.button
              onClick={() => speakText(quizData.clean_sentence || quizData.original_sentence, sourceLang)}
              className="p-3 text-[#ff006e] hover:text-[#ff006e] hover:bg-[#fff0f6] transition-colors"
            >
              <Volume2 className="w-8 h-8" />
            </motion.button>
            <motion.button
              onClick={() => speakText(quizData.clean_sentence || quizData.original_sentence, sourceLang, true)}
              className="p-3 text-[#7a7a9a] hover:text-[#ff006e] hover:bg-[#fff0f6] transition-colors"
              title={t.slowPlay || '慢速播放'}
            >
              <Turtle className="w-7 h-7" />
            </motion.button>
          </div>
        </div>

        <div className="mb-8">
          <div className="p-4 border-2 border-dashed border-[#1a1a2e] flex flex-wrap gap-2 bg-white/50 relative">
            <div className="flex flex-wrap gap-2 invisible" aria-hidden="true">
              {correctWords.map((_, i) => (
                <span key={`ph-${i}`} className="px-4 py-2 text-sm font-bold">{correctWords[i]}</span>
              ))}
            </div>
            <div className="absolute inset-0 p-4 flex flex-wrap gap-2 items-center">
              {selectedWords.length === 0 && (
                <span className="italic text-[#7a7a9a] text-sm pointer-events-none">{t.tapToBuildSentence || '按顺序点击下方单词组成句子'}</span>
              )}
              <AnimatePresence mode="popLayout">
                {selectedWords.map((item, pos) => (
                  <motion.div
                    key={`sel-${item.index}`}
                    layout
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ layout: { type: 'spring', stiffness: 500, damping: 35 }, opacity: { duration: 0.15 }, scale: { duration: 0.15 } }}
                    className={`px-4 py-2 text-sm font-bold cursor-pointer select-none ${
                      isChecked
                        ? isCorrect
                          ? 'bg-[#e6fff5] text-[#06d6a0] border-[3px] border-[#06d6a0]'
                          : pos < correctWords.length && item.word.toLowerCase() === correctWords[pos].toLowerCase()
                            ? 'bg-[#e6fff5] text-[#06d6a0] border-[3px] border-[#06d6a0]'
                            : 'bg-[#fff0f0] text-[#ef476f] border-[3px] border-[#ef476f]'
                        : 'bg-[#1a1a2e] text-white hover:bg-[#2d2d4a]'
                    }`}
                    onClick={() => handleRemoveWord(pos)}
                  >
                    {stripPunct(item.word)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {options.map((word, index) => {
              const isSelected = selectedWords.some(w => w.index === index)
              return (
                <motion.button
                  key={`opt-${index}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: isSelected ? 0 : 1, scale: isSelected ? 0 : 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleWordSelect(word, index)}
                  disabled={isSelected || isChecked}
                  className={`px-4 py-2 text-sm font-bold select-none ${
                    isSelected
                      ? 'pointer-events-none invisible'
                      : isChecked
                        ? 'pointer-events-none bg-[#1a1a2e] text-white opacity-60'
                        : 'bg-[#1a1a2e] text-white hover:bg-[#2d2d4a]'
                  }`}
                >
                  {stripPunct(word)}
                </motion.button>
              )
            })}
          </div>
        </div>

        {isChecked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 mb-6 ${isCorrect ? 'bg-[#e6fff5] border-[3px] border-[#06d6a0]' : 'bg-[#fff0f0] border-[3px] border-[#ef476f]'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isCorrect ? <CheckCircle2 className="w-6 h-6 text-[#06d6a0]" /> : <XCircle className="w-6 h-6 text-[#ef476f]" />}
              <span className={`font-black uppercase text-lg ${isCorrect ? 'text-[#06d6a0]' : 'text-[#ef476f]'}`}>
                {isSkipped ? (t.skipped || '已跳过') : isCorrect ? t.correct : t.incorrect}
              </span>
            </div>
            {(isSkipped || !isCorrect) && (
              <p className="text-[#4a4a6a] font-bold">
                {t.correctAnswer || '正确答案'}：{correctWords.map(w => stripPunct(w)).join(' ')}
              </p>
            )}
          </motion.div>
        )}

        <div className="flex gap-4">
          {!isChecked ? (
            <motion.button
              onClick={checkAnswer}
              disabled={selectedWords.length === 0}
              className="flex-1 py-4 btn-primary text-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          ) : (
            <motion.button
              onClick={handleNextQuestion}
              disabled={loading}
              className="flex-1 py-4 btn-primary text-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.loading}
                </>
              ) : (
                <>
                  {t.nextQuestion}
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

export default ListeningQuizStep
