import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Loader2, ArrowLeft, Languages, Shuffle, Volume2, ChevronRight, Brain, CheckCircle2, XCircle } from 'lucide-react'
import axios from 'axios'

// 配置axios超时时间为10分钟
axios.defaults.timeout = 600000

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
      console.log('开始处理文本，长度:', text.length)
      const response = await axios.post('/api/process-text', {
        text: text.trim(),
        source_language: sourceLang,
        target_language: targetLang
      }, {
        timeout: 600000 // 10分钟超时
      })
      
      console.log('API响应:', response.data)
      if (response.data && response.data.file_id) {
        const fileId = response.data.file_id
        setFileId(fileId)
        console.log('获取到文件ID:', fileId)
        
        // 轮询检查处理状态
        let pollCount = 0
        const maxPolls = 300 // 10分钟
        
        const pollStatus = async () => {
          pollCount++
          console.log(`第${pollCount}次轮询，文件ID: ${fileId}`)
          
          try {
            const statusResponse = await axios.get(`/api/status/${fileId}`, {
              timeout: 600000 // 10分钟超时
            })
            const status = statusResponse.data
            console.log('状态响应:', status)
            
            if (status.status === 'completed') {
              console.log('处理完成，词汇表长度:', status.vocab.length)
              setVocab(status.vocab)
              setTranslationResult(status.translation_result)
              setStep('dictionary')
              setLoading(false)
            } else if (status.status === 'error') {
              console.error('处理错误:', status.error)
              alert(`处理失败: ${status.error}`)
              setLoading(false)
            } else if (pollCount >= maxPolls) {
              console.error('轮询超时')
              alert('处理超时，请重试')
              setLoading(false)
            } else {
              // 继续轮询
              setTimeout(pollStatus, 2000)
            }
          } catch (error) {
            console.error('轮询错误:', error)
            if (pollCount >= maxPolls) {
              alert('网络错误，请重试')
              setLoading(false)
            } else {
              setTimeout(pollStatus, 2000)
            }
          }
        }
        
        pollStatus()
      } else {
        throw new Error('无效的API响应')
      }
    } catch (error) {
      console.error('处理文本错误:', error)
      alert('处理失败，请重试')
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

function DictionaryStep({ vocab, onShuffle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      {/* 单词表 - 高中课本附录格式 */}
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 gap-1 p-4 bg-slate-50 border-b border-slate-200">
            <div className="font-semibold text-slate-700">单词</div>
            <div className="font-semibold text-slate-700">意思</div>
            <div className="font-semibold text-slate-700">词性</div>
          </div>
          <div className="divide-y divide-slate-200">
            {vocab.map((word, index) => (
              <motion.div
                key={word.word || index}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="grid grid-cols-3 gap-1 p-4 hover:bg-slate-50"
              >
                <div className="font-medium text-slate-900">{word.word}</div>
                <div className="text-slate-700">{word.context_meaning || word.translation}</div>
                <div className="text-slate-600 font-mono">{word.morphology}</div>
              </motion.div>
            ))}
          </div>
        </div>
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

      <div className="space-y-6">
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
      </div>
    </motion.div>
  )
}

export default App
