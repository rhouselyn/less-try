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
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-umber-400" />
          <p className="text-lg text-umber-600">{t.loading}</p>
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
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          {totalItemsInUnit > 0 && (
            <span className="text-sm text-umber-500 font-medium">{t.step || '第'} {stepInUnit} / {totalItemsInUnit} {t.question || '题'}</span>
          )}
          {!isChecked && !isSkipped && (
            <motion.button
              onClick={handleSkipListening}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-umber-400 hover:text-cadmium-500 hover:bg-cadmium-50 rounded-lg transition-colors"
              whileTap={{ scale: 0.98 }}
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
              whileTap={{ scale: 0.98 }}
          >
            <BookOpen className="w-4 h-4" />
              {t.vocabList || '单词表'}
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-cerulean-50 via-canvas-100 to-teal-50 border-3 border-cerulean-300 rounded-3xl p-8 shadow-impasto-xl relative overflow-hidden">
        {/* 油画纹理背景 */}
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E")'}}></div>
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cerulean-100 to-teal-100 text-cerulean-700 rounded-full text-sm font-bold mb-4 border-2 border-cerulean-300 shadow-md"
            >
              <Headphones className="w-5 h-5" />
              {t.listeningQuizTitle || '听力题'}
            </motion.div>
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => speakText(quizData.clean_sentence || quizData.original_sentence, sourceLang)}
                className="p-4 bg-cerulean-500 text-white hover:bg-cerulean-600 rounded-full transition-all shadow-lg hover:shadow-xl"
              >
                <Volume2 className="w-9 h-9" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => speakText(quizData.clean_sentence || quizData.original_sentence, sourceLang, true)}
                className="p-4 bg-teal-500 text-white hover:bg-teal-600 rounded-full transition-all shadow-lg hover:shadow-xl"
                title={t.slowPlay || '慢速播放'}
              >
                <Turtle className="w-8 h-8" />
              </motion.button>
            </div>
          </div>

          <div className="mb-8">
            <div className="p-5 border-4 border-dashed border-cerulean-400 rounded-2xl flex flex-wrap gap-3 bg-gradient-to-br from-cerulean-50 to-canvas-200 relative shadow-inner">
              <div className="flex flex-wrap gap-3 invisible" aria-hidden="true">
                {correctWords.map((_, i) => (
                  <span key={`ph-${i}`} className="px-5 py-2.5 rounded-full text-sm font-semibold">{correctWords[i]}</span>
                ))}
              </div>
              <div className="absolute inset-0 p-5 flex flex-wrap gap-3 items-center">
                {selectedWords.length === 0 && (
                  <span className="italic text-umber-500 text-sm pointer-events-none font-medium">{t.tapToBuildSentence || '按顺序点击下方单词组成句子'}</span>
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
                      className={`px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer select-none shadow-md transition-all hover:shadow-lg ${
                        isChecked
                          ? isCorrect
                            ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white border-2 border-teal-700'
                            : pos < correctWords.length && item.word.toLowerCase() === correctWords[pos].toLowerCase()
                              ? 'bg-gradient-to-r from-teal-400 to-teal-600 text-white border-2 border-teal-700'
                              : 'bg-gradient-to-r from-vermilion-400 to-vermilion-600 text-white border-2 border-vermilion-700'
                          : 'bg-gradient-to-r from-cadmium-500 to-orange-600 text-white hover:from-cadmium-600 hover:to-orange-700 border-2 border-orange-700'
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
            <div className="flex flex-wrap gap-3">
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
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold select-none shadow-md transition-all hover:shadow-lg ${
                      isSelected
                        ? 'pointer-events-none invisible'
                        : isChecked
                          ? 'pointer-events-none bg-umber-300 text-umber-600 opacity-60'
                          : 'bg-gradient-to-r from-cerulean-500 to-cerulean-700 text-white hover:from-cerulean-600 hover:to-cerulean-800 border-2 border-cerulean-800'
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
              className={`p-6 rounded-2xl mb-6 border-4 shadow-lg ${isCorrect ? 'bg-gradient-to-r from-teal-100 to-teal-200 border-teal-500' : 'bg-gradient-to-r from-vermilion-100 to-vermilion-200 border-vermilion-500'}`}
            >
              <div className="flex items-center gap-4 mb-3">
                {isCorrect ? <CheckCircle2 className="w-8 h-8 text-teal-700" /> : <XCircle className="w-8 h-8 text-vermilion-700" />}
                <span className={`font-bold text-2xl ${isCorrect ? 'text-teal-800' : 'text-vermilion-800'}`}>
                  {isSkipped ? (t.skipped || '已跳过') : isCorrect ? t.correct : t.incorrect}
                </span>
              </div>
              {(isSkipped || !isCorrect) && (
                <p className="text-umber-700 font-semibold text-base">
                  {t.correctAnswer || '正确答案'}：{correctWords.map(w => stripPunct(w)).join(' ')}
                </p>
              )}
            </motion.div>
          )}
        </div>

        <div className="flex gap-4">
          {!isChecked ? (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={checkAnswer}
              disabled={selectedWords.length === 0}
              className="flex-1 py-4 btn-primary text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.checkAnswer}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNextQuestion}
              disabled={loading}
              className="flex-1 py-4 btn-primary text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
