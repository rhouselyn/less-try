import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Loader2, ArrowLeft, Languages, Shuffle, Volume2, ChevronRight, Brain, CheckCircle2, XCircle } from 'lucide-react'
import axios from 'axios'

function App() {
  const [step, setStep] = useState('input')
  const [text, setText] = useState('')
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('zh')
  const [loading, setLoading] = useState(false)
  const [fileId, setFileId] = useState(null)
  const [vocab, setVocab] = useState([])
  const [shuffledVocab, setShuffledVocab] = useState([])
  const [translationResult, setTranslationResult] = useState(null)
  const [selectedWord, setSelectedWord] = useState(null)

  useEffect(() => {
    if (vocab.length > 0) {
      shuffleVocab()
    }
  }, [vocab])

  const shuffleVocab = () => {
    const shuffled = [...vocab].sort(() => Math.random() - 0.5)
    setShuffledVocab(shuffled)
  }

  const handleProcess = async () => {
    if (!text.trim()) return
    
    setLoading(true)
    try {
      const response = await axios.post('/api/process-text', {
        text: text.trim(),
        source_language: sourceLang,
        target_language: targetLang
      })
      
      setFileId(response.data.file_id)
      setVocab(response.data.vocab)
      setTranslationResult(response.data.translation_result)
      setStep('dictionary')
    } catch (error) {
      console.error('Error processing text:', error)
      alert('处理失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">少邻国</h1>
                <p className="text-sm text-slate-500">Lesslingo</p>
              </div>
            </div>
            <AnimatePresence>
              {step === 'dictionary' && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => setStep('input')}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                  返回
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <InputStep
              key="input"
              text={text}
              setText={setText}
              sourceLang={sourceLang}
              setSourceLang={setSourceLang}
              targetLang={targetLang}
              setTargetLang={setTargetLang}
              loading={loading}
              onProcess={handleProcess}
            />
          )}
          
          {step === 'dictionary' && (
            <DictionaryStep
              key="dictionary"
              vocab={shuffledVocab}
              translationResult={translationResult}
              selectedWord={selectedWord}
              setSelectedWord={setSelectedWord}
              onShuffle={shuffleVocab}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function InputStep({ text, setText, sourceLang, setSourceLang, targetLang, setTargetLang, loading, onProcess }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-4xl font-semibold text-slate-900 mb-4">
            开始学习
          </h2>
          <p className="text-lg text-slate-600">
            输入任意文本，AI 将自动生成单词表和学习资料
          </p>
        </motion.div>
      </div>

      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              学习语言
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            >
              <option value="en">英语</option>
              <option value="es">西班牙语</option>
              <option value="de">德语</option>
              <option value="fr">法语</option>
              <option value="ja">日语</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              母语
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            >
              <option value="zh">中文</option>
              <option value="en">英语</option>
              <option value="ja">日语</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            输入文本
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="粘贴或输入你想学习的文本..."
            className="w-full h-64 px-4 py-4 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onProcess}
          disabled={loading || !text.trim()}
          className="w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Languages className="w-5 h-5" />
              生成学习资料
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}

function DictionaryStep({ vocab, translationResult, selectedWord, setSelectedWord, onShuffle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      {/* 单词表 - 横向排列 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            单词表 ({vocab.length})
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onShuffle}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Shuffle className="w-5 h-5" />
          </motion.button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {vocab.map((word, index) => (
            <motion.button
              key={word.word || index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => setSelectedWord(word)}
              className={`px-4 py-3 rounded-lg border transition-all whitespace-nowrap ${
                selectedWord?.word === word.word
                  ? 'border-black bg-black text-white'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="font-medium">{word.word}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 词典详情 */}
      <div>
        <AnimatePresence mode="wait">
          {selectedWord ? (
            <WordDetail key={selectedWord.word} word={selectedWord} />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-96 text-slate-400 bg-white rounded-2xl border border-slate-200"
            >
              <BookOpen className="w-16 h-16 mb-4 opacity-50" />
              <p>选择一个单词查看详情</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function WordDetail({ word }) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayAudio = () => {
    setIsPlaying(true)
    setTimeout(() => setIsPlaying(false), 1000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
    >
      <div className="flex items-start justify-between mb-8">
        <div>
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl font-semibold text-slate-900 mb-2"
          >
            {word.word}
          </motion.h2>
          <div className="flex items-center gap-3">
            {word.ipa && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-slate-500 font-mono"
              >
                /{word.ipa}/
              </motion.p>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayAudio}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            >
              <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
            </motion.button>
          </div>
        </div>
        {word.morphology && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium"
          >
            {word.morphology}
          </motion.span>
        )}
      </div>

      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            释义
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {word.context_meaning}
          </p>
        </motion.div>

        {word.variants && word.variants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              变体
            </h3>
            <div className="flex flex-wrap gap-2">
              {word.variants.map((variant, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm"
                >
                  {variant.type}: {variant.form}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {word.examples && word.examples.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              例句
            </h3>
            <div className="space-y-4">
              {word.examples.map((example, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-slate-700">{example}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {word.options && word.options.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              选项
            </h3>
            <div className="space-y-2">
              {word.options.map((option, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  {word.correct_answer === i ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <span className="text-slate-700">{option}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {word.grammar && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              语法讲解
            </h3>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-slate-700 leading-relaxed">{word.grammar}</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default App
