import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Loader2, ArrowLeft, Languages, CheckCircle2, XCircle, ChevronRight, Brain } from 'lucide-react'
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
  const [wordCards, setWordCards] = useState([])
  const [displayVocab, setDisplayVocab] = useState([])
  const [sentenceTranslations, setSentenceTranslations] = useState([])
  const [selectedWord, setSelectedWord] = useState(null)
  const [selectedSentence, setSelectedSentence] = useState(null)
  const [progress, setProgress] = useState(0)
  const [processingInfo, setProcessingInfo] = useState(null)
  const [currentFileId, setCurrentFileId] = useState(null)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [generatingCard, setGeneratingCard] = useState(false)
  const [currentWordCard, setCurrentWordCard] = useState(null)

  useEffect(() => {
    if (vocab.length > 0) {
      sortVocab()
    }
  }, [vocab])

  // 轮询处理状态
  useEffect(() => {
    if (!currentFileId) return

    console.log('开始轮询，文件ID:', currentFileId)

    let pollCount = 0
    const maxPolls = 300 // 10分钟
    let pollingInterval = null

    const pollStatus = async () => {
      pollCount++
      console.log(`第${pollCount}次轮询，文件ID: ${currentFileId}`)

      try {
        const response = await axios.get(`/api/status/${currentFileId}`, {
          timeout: 600000 // 10分钟超时
        })
        const status = response.data
        console.log('状态响应:', status)

        // 强制更新词汇表和句子翻译，确保实时显示
        if (status.vocab) {
          console.log('更新词汇表，长度:', status.vocab.length)
          setVocab([...status.vocab]) // 使用展开运算符强制更新
        }

        if (status.sentence_translations) {
          console.log('更新句子翻译，数量:', status.sentence_translations.length)
          setSentenceTranslations([...status.sentence_translations]) // 使用展开运算符强制更新
        }

        // 更新进度
        if (status.progress !== undefined) {
          setProgress(status.progress)
        }

        // 更新处理信息
        if (status.current_sentence !== undefined && status.total_sentences !== undefined) {
          setProcessingInfo({
            current: status.current_sentence,
            total: status.total_sentences
          })
        }

        if (status.status === 'completed') {
          console.log('处理完成，词汇表长度:', status.vocab.length)
          setVocab([...status.vocab])
          setSentenceTranslations([...status.sentence_translations])
          setProgress(100)
          setProcessingInfo(null)
          setLoading(false)
          // 停止轮询
          if (pollingInterval) {
            clearInterval(pollingInterval)
          }
        } else if (status.status === 'error') {
          console.error('处理错误:', status.error)
          alert(`处理失败: ${status.error}`)
          setLoading(false)
          // 停止轮询
          if (pollingInterval) {
            clearInterval(pollingInterval)
          }
        } else if (pollCount >= maxPolls) {
          console.error('轮询超时')
          alert('处理超时，请重试')
          setLoading(false)
          // 停止轮询
          if (pollingInterval) {
            clearInterval(pollingInterval)
          }
        }
      } catch (error) {
        console.error('轮询错误:', error)
        if (pollCount >= maxPolls) {
          alert('网络错误，请重试')
          setLoading(false)
          // 停止轮询
          if (pollingInterval) {
            clearInterval(pollingInterval)
          }
        }
      }
    }

    // 立即执行一次轮询
    pollStatus()
    // 设置轮询间隔
    pollingInterval = setInterval(pollStatus, 500)

    // 清理函数
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [currentFileId])

  const sortVocab = () => {
    const sorted = [...vocab].sort((a, b) => {
      const wordA = a.word.toLowerCase()
      const wordB = b.word.toLowerCase()
      return wordA.localeCompare(wordB)
    })
    setDisplayVocab(sorted)
  }

  const handleSentenceClick = (index) => {
    setSelectedSentence(index)
  }

  const handleCloseSentenceDetail = () => {
    setSelectedSentence(null)
  }

  const handleProcess = async () => {
    if (!text.trim()) return
    
    setLoading(true)
    setProgress(0)
    setProcessingInfo(null)
    setVocab([])
    setSentenceTranslations([])
    setWordCards([])
    
    // 立即跳转到单词表页面，即使还没有收到响应
    setStep('dictionary')
    
    try {
      console.log('开始处理文本，长度:', text.length)
      const response = await axios.post('/api/process-text', {
        text: text.trim(),
        source_lang: sourceLang,
        target_lang: targetLang
      }, {
        timeout: 600000 // 10分钟超时
      })
      
      console.log('API响应:', response.data)
      if (response.data && response.data.file_id) {
        const fileId = response.data.file_id
        setFileId(fileId)
        setCurrentFileId(fileId)
        console.log('获取到文件ID:', fileId)
      } else {
        throw new Error('无效的API响应')
      }
    } catch (error) {
      console.error('处理文本错误:', error)
      if (error.response && error.response.status === 504) {
        // 504错误表示网关超时，可能是网络延迟或后端处理时间过长
        alert('网络连接超时，请检查网络连接后重试')
      } else if (error.message && error.message.includes('timeout')) {
        // 处理超时错误
        alert('处理超时，请稍后重试')
      } else {
        // 其他错误
        alert('处理失败，请重试')
      }
      setLoading(false)
    }
  }

  // 开始学习模式
  const handleStartLearning = async () => {
    setCurrentWordIndex(0)
    setWordCards([])
    setStep('learning')
    await loadWordCard(0)
  }

  // 加载单词卡
  const loadWordCard = async (index) => {
    if (index < 0 || index >= vocab.length) return
    
    const word = vocab[index]
    setGeneratingCard(true)
    setCurrentWordCard(null)
    
    try {
      console.log(`正在为单词 "${word.word}" 生成单词卡...`)
      const response = await axios.post('/api/generate-word-card', {
        word: word.word,
        context: text,
        source_lang: sourceLang,
        target_lang: targetLang
      })
      
      const wordCard = response.data.word_card
      console.log('单词卡生成完成:', wordCard)
      
      setCurrentWordCard(wordCard)
      
      // 保存到单词卡数组
      setWordCards(prev => {
        const newCards = [...prev]
        newCards[index] = wordCard
        return newCards
      })
    } catch (error) {
      console.error('生成单词卡失败:', error)
      alert('生成单词卡失败，请重试')
    } finally {
      setGeneratingCard(false)
    }
  }

  // 下一个单词
  const handleNextWord = async () => {
    if (currentWordIndex < vocab.length - 1) {
      const nextIndex = currentWordIndex + 1
      setCurrentWordIndex(nextIndex)
      await loadWordCard(nextIndex)
    } else {
      // 完成所有单词
      setStep('dictionary')
    }
  }

  // 上一个单词
  const handlePrevWord = async () => {
    if (currentWordIndex > 0) {
      const prevIndex = currentWordIndex - 1
      setCurrentWordIndex(prevIndex)
      await loadWordCard(prevIndex)
    }
  }

  return (
    <div className="min-h-screen bg-anthropic-light">
      <header className="bg-white border-b border-anthropic-light-gray shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-anthropic-dark rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-anthropic-dark font-sans">少邻国</h1>
                <p className="text-sm text-anthropic-mid-gray font-serif">Lesslingo</p>
              </div>
            </div>
            <AnimatePresence>
              {(step === 'dictionary' || step === 'learning') && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => setStep('dictionary')}
                  className="flex items-center gap-2 px-4 py-2 text-anthropic-mid-gray hover:text-anthropic-dark transition-colors rounded-md hover:bg-anthropic-light-gray"
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
              vocab={displayVocab}
              wordCards={wordCards}
              progress={progress}
              processingInfo={processingInfo}
              sentenceTranslations={sentenceTranslations}
              onSentenceClick={handleSentenceClick}
              onStartLearning={handleStartLearning}
            />
          )}

          {step === 'learning' && (
            <LearningStep
              key="learning"
              vocab={vocab}
              currentWordIndex={currentWordIndex}
              wordCards={wordCards}
              currentWordCard={currentWordCard}
              generatingCard={generatingCard}
              onNextWord={handleNextWord}
              onPrevWord={handlePrevWord}
              onBackToDictionary={() => setStep('dictionary')}
            />
          )}
          
          {selectedSentence !== null && (
            <SentenceDetail
              key={`sentence-${selectedSentence}`}
              sentenceTranslation={sentenceTranslations[selectedSentence]}
              onClose={handleCloseSentenceDetail}
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
          <h2 className="text-4xl font-semibold text-anthropic-dark mb-4 font-sans">
            开始学习
          </h2>
          <p className="text-lg text-anthropic-mid-gray font-serif">
            输入任意文本，AI 将自动生成单词表和学习资料
          </p>
        </motion.div>
      </div>

      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-anthropic-dark mb-2 font-sans">
              学习语言
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full px-4 py-3 border border-anthropic-light-gray rounded-lg bg-white text-anthropic-dark focus:outline-none focus:ring-2 focus:ring-anthropic-orange focus:border-transparent transition-all font-serif"
            >
              <option value="en">英语</option>
              <option value="es">西班牙语</option>
              <option value="de">德语</option>
              <option value="fr">法语</option>
              <option value="ja">日语</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-anthropic-dark mb-2 font-sans">
              母语
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full px-4 py-3 border border-anthropic-light-gray rounded-lg bg-white text-anthropic-dark focus:outline-none focus:ring-2 focus:ring-anthropic-orange focus:border-transparent transition-all font-serif"
            >
              <option value="zh">中文</option>
              <option value="en">英语</option>
              <option value="ja">日语</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-anthropic-dark mb-2 font-sans">
            输入文本
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="粘贴或输入你想学习的文本..."
            className="w-full h-64 px-4 py-4 border border-anthropic-light-gray rounded-lg bg-white text-anthropic-dark placeholder-anthropic-mid-gray focus:outline-none focus:ring-2 focus:ring-anthropic-orange focus:border-transparent transition-all resize-none font-serif"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onProcess}
          disabled={loading || !text.trim()}
          className="w-full py-4 bg-anthropic-orange text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-sans"
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

function DictionaryStep({ vocab, wordCards, progress, processingInfo, sentenceTranslations, onSentenceClick, onStartLearning }) {
  // 安全检查，确保sentenceTranslations是数组
  const safeSentenceTranslations = Array.isArray(sentenceTranslations) ? sentenceTranslations : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      {/* 处理进度条 */}
      {processingInfo && (
        <div className="bg-white border border-anthropic-light-gray rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-anthropic-mid-gray font-serif">处理中: 句子 {processingInfo.current} / {processingInfo.total}</span>
            <span className="text-sm text-anthropic-mid-gray font-serif">{progress}%</span>
          </div>
          <div className="w-full bg-anthropic-light-gray rounded-full h-2.5">
            <div 
              className="bg-anthropic-orange h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 学习开始按钮 */}
      {vocab.length > 0 && !processingInfo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-anthropic-orange to-anthropic-blue rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-white mb-2 font-sans">准备好学习了吗？</h3>
              <p className="text-white/80 font-serif">共 {vocab.length} 个单词等待学习</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartLearning}
              className="px-8 py-3 bg-white text-anthropic-orange font-semibold rounded-xl hover:bg-white/90 transition-colors font-sans"
            >
              开始学习 →
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* 句子列表 */}
      {safeSentenceTranslations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-anthropic-dark mb-4 font-sans">句子翻译</h2>
          <div className="bg-white border border-anthropic-light-gray rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-anthropic-light-gray">
              {safeSentenceTranslations.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 hover:bg-anthropic-light cursor-pointer"
                  onClick={() => onSentenceClick(index)}
                >
                  <div className="font-medium text-anthropic-dark mb-2 font-serif">{item.sentence}</div>
                  {item.translation_result && item.translation_result.tokenized_translation && (
                    <div className="text-anthropic-mid-gray font-serif">{item.translation_result.tokenized_translation}</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 单词表 */}
      <div>
        <h2 className="text-xl font-semibold text-anthropic-dark mb-4 font-sans">
          单词表 ({vocab.length})
        </h2>
        <div className="bg-white border border-anthropic-light-gray rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 gap-1 p-4 bg-anthropic-light-gray border-b border-anthropic-light-gray">
            <div className="font-semibold text-anthropic-dark font-sans">单词</div>
            <div className="font-semibold text-anthropic-dark font-sans">意思</div>
            <div className="font-semibold text-anthropic-dark font-sans">词性</div>
          </div>
          <div className="divide-y divide-anthropic-light-gray">
            {vocab.map((word, index) => (
              <motion.div
                key={word.word || index}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="grid grid-cols-3 gap-1 p-4 hover:bg-anthropic-light-gray/50"
              >
                <div className="font-medium text-anthropic-dark font-serif">{word.word}</div>
                <div className="text-anthropic-mid-gray font-serif">{word.context_meaning || word.translation}</div>
                <div className="text-anthropic-mid-gray font-mono">{word.morphology}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function LearningStep({ vocab, currentWordIndex, wordCards, currentWordCard, generatingCard, onNextWord, onPrevWord, onBackToDictionary }) {
  const currentWord = vocab[currentWordIndex]
  const totalWords = vocab.length
  const progressPercentage = ((currentWordIndex + 1) / totalWords) * 100

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-4xl mx-auto"
    >
      {/* 进度条 */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-anthropic-dark font-sans">
            单词 {currentWordIndex + 1} / {totalWords}
          </span>
          <span className="text-sm text-anthropic-mid-gray font-serif">{Math.round(progressPercentage)}% 完成</span>
        </div>
        <div className="w-full bg-anthropic-light-gray rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5 }}
            className="bg-anthropic-orange h-2 rounded-full"
          />
        </div>
      </div>

      {/* 单词卡 */}
      <div className="bg-white rounded-3xl shadow-lg border border-anthropic-light-gray overflow-hidden">
        {generatingCard ? (
          <div className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-anthropic-orange animate-spin" />
            <p className="text-anthropic-mid-gray font-serif">正在为 "{currentWord?.word}" 生成单词卡...</p>
          </div>
        ) : currentWordCard ? (
          <WordCard wordCard={currentWordCard} />
        ) : (
          <div className="p-12 text-center">
            <p className="text-anthropic-mid-gray font-serif">加载失败</p>
          </div>
        )}
      </div>

      {/* 导航按钮 */}
      <div className="flex justify-between mt-8">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPrevWord}
          disabled={currentWordIndex === 0 || generatingCard}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-anthropic-light-gray text-anthropic-dark rounded-xl hover:bg-anthropic-light-gray disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
        >
          <ArrowLeft className="w-4 h-4" />
          上一个
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBackToDictionary}
          disabled={generatingCard}
          className="px-6 py-3 bg-white border border-anthropic-light-gray text-anthropic-dark rounded-xl hover:bg-anthropic-light-gray disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
        >
          返回单词表
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNextWord}
          disabled={generatingCard}
          className="flex items-center gap-2 px-6 py-3 bg-anthropic-orange text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
        >
          {currentWordIndex < totalWords - 1 ? '下一个' : '完成'}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  )
}

function WordCard({ wordCard }) {
  return (
    <div className="p-8">
      {/* 单词标题 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 pb-6 border-b border-anthropic-light-gray"
      >
        <h2 className="text-4xl font-bold text-anthropic-dark mb-2 font-sans">
          {wordCard.word}
        </h2>
        {wordCard.ipa && (
          <p className="text-xl text-anthropic-mid-gray font-mono">
            /{wordCard.ipa}/
          </p>
        )}
      </motion.div>

      {/* 释义 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-anthropic-orange" />
          <h3 className="text-sm font-semibold text-anthropic-mid-gray uppercase tracking-wider font-sans">释义</h3>
        </div>
        <p className="text-2xl text-anthropic-dark font-serif leading-relaxed">
          {wordCard.context_meaning}
        </p>
      </motion.div>

      {/* 变体 */}
      {wordCard.variants && wordCard.variants.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h3 className="text-sm font-semibold text-anthropic-mid-gray uppercase tracking-wider mb-3 font-sans">变体</h3>
          <div className="flex flex-wrap gap-2">
            {wordCard.variants.map((variant, idx) => (
              <span key={idx} className="px-3 py-1 bg-anthropic-light-gray text-anthropic-dark rounded-full text-sm font-serif">
                {variant.type}: {variant.form}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* 例句 */}
      {wordCard.examples && wordCard.examples.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h3 className="text-sm font-semibold text-anthropic-mid-gray uppercase tracking-wider mb-3 font-sans">例句</h3>
          <div className="space-y-4">
            {wordCard.examples.map((example, idx) => (
              <div key={idx} className="p-4 bg-anthropic-light-gray/50 rounded-xl">
                <p className="text-anthropic-dark font-serif">{example}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 语法 */}
      {wordCard.grammar && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-sm font-semibold text-anthropic-mid-gray uppercase tracking-wider mb-3 font-sans">语法</h3>
          <div className="p-4 bg-anthropic-blue/10 border border-anthropic-blue/20 rounded-xl">
            <p className="text-anthropic-dark font-serif">{wordCard.grammar}</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function SentenceDetail({ sentenceTranslation, onClose }) {
  const sentence = sentenceTranslation?.sentence
  const translationResult = sentenceTranslation?.translation_result
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-anthropic-light-gray rounded-2xl p-8 shadow-sm"
    >
      <div className="flex items-center justify-between mb-8">
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-semibold text-anthropic-dark font-sans"
        >
          句子详情
        </motion.h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 text-anthropic-mid-gray hover:text-anthropic-dark hover:bg-anthropic-light-gray rounded-full transition-colors"
        >
          <XCircle className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-semibold text-anthropic-mid-gray uppercase tracking-wider mb-3 font-sans">
            原文
          </h3>
          <p className="text-lg text-anthropic-dark leading-relaxed font-serif">
            {sentence}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-anthropic-mid-gray uppercase tracking-wider mb-3 font-sans">
            翻译
          </h3>
          <p className="text-lg text-anthropic-mid-gray leading-relaxed font-serif">
            {translationResult?.tokenized_translation || '翻译中...'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-sm font-semibold text-anthropic-mid-gray uppercase tracking-wider mb-3 flex items-center gap-2 font-sans">
            <Brain className="w-4 h-4" />
            语法详解
          </h3>
          <p className="text-lg text-anthropic-mid-gray leading-relaxed font-serif">
            {translationResult?.grammar_explanation || '语法分析中...'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default App
