import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Loader2, ArrowLeft, Languages, Shuffle, Volume2, ChevronRight, Brain, CheckCircle2, XCircle } from 'lucide-react'
import axios from 'axios'

// 配置axios超时时间为10分钟
axios.defaults.timeout = 600000

// 语言翻译字典
const translations = {
  zh: {
    title: "少邻国",
    subtitle: "Lesslingo",
    startLearning: "开始学习",
    inputHint: "输入任意文本，AI 将自动生成单词表和学习资料",
    learnLang: "学习语言",
    nativeLang: "母语",
    inputText: "输入文本",
    placeholder: "粘贴或输入你想学习的文本...",
    processing: "处理中...",
    generateMaterials: "生成学习资料",
    back: "返回",
    startRandomLearn: "开始随机单词学习",
    preparing: "准备中...",
    sentTranslation: "句子翻译",
    vocabList: "单词表",
    wordLabel: "单词",
    meaningLabel: "意思",
    posLabel: "词性",
    definition: "释义",
    variants: "词形变化",
    examples: "例句",
    memoryHint: "记忆辅助",
    originalSent: "原文例句",
    sentDetail: "句子详情",
    original: "原文",
    translation: "翻译",
    grammar: "语法详解",
    backToVocab: "返回单词表",
    loading: "加载中...",
    nextQuestion: "下一题",
    question: "题干",
    correctAnswer: "正确答案",
    options: "选项",
    context: "上下文",
    studyThisWord: "学习这个单词",
    aToZ: "A → Z",
    zToA: "Z → A"
  },
  en: {
    title: "Lesslingo",
    subtitle: "",
    startLearning: "Start Learning",
    inputHint: "Enter any text, AI will automatically generate word list and study materials",
    learnLang: "Learn Language",
    nativeLang: "Native Language",
    inputText: "Enter Text",
    placeholder: "Paste or enter text you want to learn...",
    processing: "Processing...",
    generateMaterials: "Generate Study Materials",
    back: "Back",
    startRandomLearn: "Start Random Word Learning",
    preparing: "Preparing...",
    sentTranslation: "Sentence Translations",
    vocabList: "Vocabulary List",
    wordLabel: "Word",
    meaningLabel: "Meaning",
    posLabel: "Part of Speech",
    definition: "Definition",
    variants: "Word Forms",
    examples: "Examples",
    memoryHint: "Memory Hint",
    originalSent: "Original Sentence",
    sentDetail: "Sentence Details",
    original: "Original",
    translation: "Translation",
    grammar: "Grammar Explanation",
    backToVocab: "Back to Vocab List",
    loading: "Loading...",
    nextQuestion: "Next Question",
    question: "Question",
    correctAnswer: "Correct Answer",
    options: "Options",
    context: "Context",
    studyThisWord: "Study This Word",
    aToZ: "A → Z",
    zToA: "Z → A"
  }
};

function App() {
  const [step, setStep] = useState('input')
  const [text, setText] = useState('')
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('zh')
  const [loading, setLoading] = useState(false)
  const [fileId, setFileId] = useState(null)
  const [vocab, setVocab] = useState([])
  const [displayVocab, setDisplayVocab] = useState([])
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' 或 'desc'
  const [sentenceTranslations, setSentenceTranslations] = useState([])
  const [selectedWord, setSelectedWord] = useState(null)
  const [selectedSentence, setSelectedSentence] = useState(null)
  const [progress, setProgress] = useState(0)
  const [processingInfo, setProcessingInfo] = useState(null)
  const [currentFileId, setCurrentFileId] = useState(null)
  const [learningData, setLearningData] = useState(null)
  const [showWordCard, setShowWordCard] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [learningUnits, setLearningUnits] = useState([])
  const [currentUnit, setCurrentUnit] = useState(0)
  const [unitProgress, setUnitProgress] = useState({})
  const [uncoveredSentences, setUncoveredSentences] = useState([])
  
  // 获取当前语言的翻译
  const t = translations[targetLang] || translations.zh;

  useEffect(() => {
    if (vocab.length > 0) {
      sortVocab()
    }
  }, [vocab, sortOrder])

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
      return sortOrder === 'asc' ? wordA.localeCompare(wordB) : wordB.localeCompare(wordA)
    })
    setDisplayVocab(sorted)
  }

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const handleSentenceClick = (index) => {
    setSelectedSentence(prev => prev === index ? null : index)
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
    
    // 立即跳转到单词表页面，即使还没有收到响应
    setStep('dictionary')
    
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

  const startLearning = async () => {
    if (!currentFileId) return
    
    setLoading(true)
    try {
      // 先获取学习单元
      await getLearningUnits()
      // 跳转到进度页面
      setStep('progress')
    } catch (error) {
      console.error('开始学习错误:', error)
      alert('无法开始学习，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleOptionSelect = (index) => {
    setSelectedOption(index)
    const isCorrectAnswer = index === learningData.correct_index
    setIsCorrect(isCorrectAnswer)
    if (isCorrectAnswer) {
      setShowWordCard(true)
    }
  }

  const getNextWord = async () => {
    if (!currentFileId) return
    
    setLoading(true)
    try {
      // 先调用 API 更新进度
      await axios.post(`/api/learn/${currentFileId}/next-word`)
      // 然后获取下一个单词
      const response = await axios.get(`/api/learn/${currentFileId}/random-word`)
      setLearningData(response.data)
      setShowWordCard(false)
      setSelectedOption(null)
      setIsCorrect(null)
    } catch (error) {
      console.error('获取下一个单词错误:', error)
      alert('无法获取下一个单词，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getWordDetails = async (word) => {
    if (!currentFileId) return
    
    // 如果点击的是当前选中的单词，则取消选中
    if (selectedWord && selectedWord.word === word) {
      setSelectedWord(null)
      return
    }
    
    try {
      const response = await axios.get(`/api/word/${currentFileId}/${word}`)
      setSelectedWord(response.data)
    } catch (error) {
      console.error('获取单词详情错误:', error)
    }
  }

  const handleStudyWord = (wordData) => {
    setLearningData(wordData)
    setShowWordCard(false)
    setSelectedOption(null)
    setIsCorrect(null)
    setStep('learning')
  }

  const getLearningUnits = async () => {
    if (!currentFileId) return
    
    setLoading(true)
    try {
      const response = await axios.get(`/api/learn/${currentFileId}/units`)
      setLearningUnits(response.data.units)
      setCurrentUnit(response.data.current_unit)
      setUnitProgress({
        completed_units: response.data.completed_units,
        current_unit: response.data.current_unit,
        total_units: response.data.total_units
      })
    } catch (error) {
      console.error('获取学习单元错误:', error)
    } finally {
      setLoading(false)
    }
  }

  const startLearningUnit = async (unitId) => {
    if (!currentFileId) return
    
    setLoading(true)
    try {
      const response = await axios.post(`/api/learn/${currentFileId}/unit/${unitId}/start`)
      // 检查是否有可学习的句子
      await checkCoverage(unitId)
      // 开始学习单词
      setStep('learning')
    } catch (error) {
      console.error('开始学习单元错误:', error)
    } finally {
      setLoading(false)
    }
  }

  const completeLearningUnit = async (unitId) => {
    if (!currentFileId) return
    
    setLoading(true)
    try {
      const response = await axios.post(`/api/learn/${currentFileId}/unit/${unitId}/complete`)
      // 更新单元进度
      await getLearningUnits()
      // 检查是否有可学习的句子
      await checkCoverage(unitId)
    } catch (error) {
      console.error('完成学习单元错误:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkCoverage = async (unitId) => {
    if (!currentFileId) return
    
    try {
      const response = await axios.get(`/api/learn/${currentFileId}/unit/${unitId}/check-coverage`)
      setUncoveredSentences(response.data.uncovered_sentences)
      if (response.data.uncovered_sentences.length > 0) {
        // 有可学习的句子，进入句子翻译题
        setStep('sentence-translation')
      }
    } catch (error) {
      console.error('检查句子覆盖度错误:', error)
    }
  }

  const markSentenceCovered = async (sentenceIndex) => {
    if (!currentFileId) return
    
    try {
      await axios.post(`/api/learn/${currentFileId}/sentence/${sentenceIndex}/mark-covered`)
      // 重新检查覆盖度
      await checkCoverage(currentUnit)
    } catch (error) {
      console.error('标记句子覆盖错误:', error)
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
                <h1 className="text-xl font-semibold text-slate-900">{t.title}</h1>
                <p className="text-sm text-slate-500">{t.subtitle || 'Lesslingo'}</p>
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
                  {t.back}
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
              t={t}
            />
          )}
          
          {step === 'dictionary' && (
            <DictionaryStep
              key="dictionary"
              vocab={displayVocab}
              onToggleSort={toggleSortOrder}
              sortOrder={sortOrder}
              progress={progress}
              processingInfo={processingInfo}
              sentenceTranslations={sentenceTranslations}
              selectedSentence={selectedSentence}
              selectedWord={selectedWord}
              onSentenceClick={handleSentenceClick}
              onCloseSentenceDetail={handleCloseSentenceDetail}
              onWordClick={getWordDetails}
              onStartLearning={startLearning}
              loading={loading}
              t={t}
              onStudyWord={handleStudyWord}
            />
          )}
          
          {step === 'learning' && (
            <LearningStep
              key="learning"
              learningData={learningData}
              showWordCard={showWordCard}
              selectedOption={selectedOption}
              isCorrect={isCorrect}
              onOptionSelect={handleOptionSelect}
              onNextWord={getNextWord}
              onBack={() => setStep('progress')}
              loading={loading}
              t={t}
            />
          )}
          
          {step === 'progress' && (
            <ProgressStep
              key="progress"
              units={learningUnits}
              unitProgress={unitProgress}
              onStartUnit={startLearningUnit}
              onBack={() => setStep('dictionary')}
              loading={loading}
              t={t}
            />
          )}
          
          {step === 'sentence-translation' && (
            <SentenceTranslationStep
              key="sentence-translation"
              sentences={uncoveredSentences}
              onMarkCovered={markSentenceCovered}
              onBack={() => setStep('progress')}
              t={t}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function InputStep({ text, setText, sourceLang, setSourceLang, targetLang, setTargetLang, loading, onProcess, t }) {
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
            {t.startLearning}
          </h2>
          <p className="text-lg text-slate-600">
            {t.inputHint}
          </p>
        </motion.div>
      </div>

      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t.learnLang}
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            >
              <option value="zh">中文</option>
              <option value="en">英语</option>
              <option value="es">西班牙语</option>
              <option value="de">德语</option>
              <option value="fr">法语</option>
              <option value="ja">日语</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t.nativeLang}
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
            {t.inputText}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.placeholder}
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
              {t.processing}
            </>
          ) : (
            <>
              <Languages className="w-5 h-5" />
              {t.generateMaterials}
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}

function DictionaryStep({ vocab, onToggleSort, sortOrder, progress, processingInfo, sentenceTranslations, selectedSentence, selectedWord, onSentenceClick, onWordClick, onStartLearning, loading, t, onStudyWord }) {
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
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-slate-600">{t.processing}: 句子 {processingInfo.current} / {processingInfo.total}</span>
            <span className="text-sm text-slate-600">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div 
              className="bg-black h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 开始学习按钮 */}
      {!processingInfo && vocab.length > 0 && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onStartLearning}
          disabled={loading}
          className="w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t.preparing}
            </>
          ) : (
            <>
              <Shuffle className="w-5 h-5" />
              {t.startRandomLearn}
            </>
          )}
        </motion.button>
      )}

      {/* 句子列表 */}
      {safeSentenceTranslations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">{t.sentTranslation}</h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-200">
              {safeSentenceTranslations.map((item, index) => (
                <div key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => onSentenceClick(index)}
                  >
                    <div className="font-medium text-slate-900 mb-2">{item.sentence}</div>
                    {item.translation_result && item.translation_result.tokenized_translation && (
                      <div className="text-slate-700">{item.translation_result.tokenized_translation}</div>
                    )}
                  </motion.div>
                  {selectedSentence === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200 p-4 bg-slate-50"
                    >
                      <SentenceDetail
                        sentenceTranslation={safeSentenceTranslations[index]}
                        t={t}
                      />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 单词表 - 高中课本附录格式 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {t.vocabList} ({vocab.length})
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleSort}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            {sortOrder === 'asc' ? t.aToZ : t.zToA}
          </motion.button>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 gap-1 p-4 bg-slate-50 border-b border-slate-200">
            <div className="font-semibold text-slate-700">{t.wordLabel}</div>
            <div className="font-semibold text-slate-700">{t.meaningLabel}</div>
            <div className="font-semibold text-slate-700">{t.posLabel}</div>
          </div>
          <div className="divide-y divide-slate-200">
            {vocab.map((word, index) => (
              <div key={word.word || index}>
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="grid grid-cols-3 gap-1 p-4 hover:bg-slate-50 cursor-pointer"
                  onClick={() => onWordClick(word.word)}
                >
                  <div className="font-medium text-slate-900 hover:text-black transition-colors">{word.word}</div>
                  <div className="text-slate-700">{word.context_meaning}</div>
                  <div className="text-slate-600 font-mono">{word.morphology}</div>
                </motion.div>
                {selectedWord && selectedWord.word === word.word && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-slate-200 p-4 bg-slate-50"
                  >
                    <WordDetail
                      word={selectedWord}
                      t={t}
                      onStudyWord={onStudyWord}
                    />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function WordDetail({ word, t, onStudyWord }) {
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
                className="text-xl text-slate-500 ipa-font"
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

      {/* 学习按钮 */}
      {word.options && word.options.length > 0 && onStudyWord && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onStudyWord(word)}
            className="w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Brain className="w-5 h-5" />
            {t.studyThisWord}
          </motion.button>
        </motion.div>
      )}

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {t.definition}
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {word.meaning || word.context_meaning}
          </p>
        </motion.div>

        {word.variants_detail && word.variants_detail.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.variants}
            </h3>
            <div className="space-y-2">
              {word.variants_detail.map((variant, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm font-medium">
                    {variant.type}
                  </span>
                  <span className="text-slate-700">{variant.form}</span>
                </div>
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
              {t.examples}
            </h3>
            <div className="space-y-4">
              {word.examples.map((example, index) => (
                <div key={index} className="border-l-4 border-slate-200 pl-4">
                  <p className="text-slate-900 mb-1">{example.sentence}</p>
                  <p className="text-slate-600 text-sm">{example.translation}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {word.memory_hint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.memoryHint}
            </h3>
            <p className="text-lg text-slate-700 leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-100">
              {word.memory_hint}
            </p>
          </motion.div>
        )}

        {word.context_sentences && word.context_sentences.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.originalSent}
            </h3>
            <div className="space-y-2">
              {word.context_sentences.map((sentence, index) => (
                <p key={index} className="text-slate-700 italic">{sentence}</p>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function SentenceDetail({ sentenceTranslation, t }) {
  const sentence = sentenceTranslation?.sentence
  const translationResult = sentenceTranslation?.translation_result
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
    >
      <div className="flex items-center mb-8">
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-semibold text-slate-900"
        >
          {t.sentDetail}
        </motion.h2>
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.original}
          </h3>
          <p className="text-lg text-slate-900 leading-relaxed">
            {sentence}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.translation}
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {translationResult?.tokenized_translation || t.loading}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {t.grammar}
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {translationResult?.grammar_explanation || t.loading}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

function LearningStep({ learningData, showWordCard, selectedOption, isCorrect, onOptionSelect, onNextWord, onBack, loading, t }) {
  if (!learningData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-lg text-slate-600">{t.loading}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      {/* 返回按钮 */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.backToVocab}
      </motion.button>

      <AnimatePresence mode="wait">
        {!showWordCard ? (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
          >
            <div className="text-center mb-8">
              <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-4xl font-semibold text-slate-900 mb-2"
              >
                {learningData.word}
              </motion.h2>
              {learningData.ipa && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl text-slate-500 ipa-font"
                >
                  /{learningData.ipa}/
                </motion.p>
              )}
            </div>

            <div className="space-y-4">
              {learningData.options.map((option, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOptionSelect(index)}
                  disabled={selectedOption !== null && isCorrect}
                  className={`w-full py-4 px-6 text-left rounded-lg transition-all ${selectedOption === index ? (isCorrect ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800') : 'bg-white border border-slate-200 text-slate-900 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    {selectedOption === index && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </motion.div>
                    )}
                    <span className="text-lg">{option}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="word-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
          >
            <div className="flex items-start justify-between mb-8">
              <div>
                <motion.h2 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-4xl font-semibold text-slate-900 mb-2"
                >
                  {learningData.word}
                </motion.h2>
                {learningData.ipa && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl text-slate-500 ipa-font"
                  >
                    /{learningData.ipa}/
                  </motion.p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  {t.definition}
                </h3>
                <p className="text-lg text-slate-700 leading-relaxed">
                  {learningData.correct_meaning}
                </p>
              </motion.div>

              {learningData.context && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t.context}
                  </h3>
                  <p className="text-lg text-slate-700 leading-relaxed italic">
                    {learningData.context}
                  </p>
                </motion.div>
              )}

              {learningData.variants_detail && learningData.variants_detail.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t.variants}
                  </h3>
                  <div className="space-y-2">
                    {learningData.variants_detail.map((variant, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm font-medium">
                          {variant.type}
                        </span>
                        <span className="text-slate-700">{variant.form}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {learningData.examples && learningData.examples.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t.examples}
                  </h3>
                  <div className="space-y-4">
                    {learningData.examples.map((example, index) => (
                      <div key={index} className="border-l-4 border-slate-200 pl-4">
                        <p className="text-slate-900 mb-1">{example.sentence}</p>
                        <p className="text-slate-600 text-sm">{example.translation}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {learningData.memory_hint && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    {t.memoryHint}
                  </h3>
                  <p className="text-lg text-slate-700 leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-100">
                    {learningData.memory_hint}
                  </p>
                </motion.div>
              )}
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onNextWord}
              disabled={loading}
              className="mt-8 w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ProgressStep({ units, unitProgress, onStartUnit, onBack, loading, t }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      {/* 返回按钮 */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.backToVocab}
      </motion.button>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">学习进度</h2>
        
        <div className="space-y-4">
          {units.map((unit, index) => (
            <motion.div
              key={unit.unit_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-lg border transition-all ${unit.is_current ? 'border-black bg-slate-50' : unit.is_completed ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-slate-900">
                  单元 {unit.unit_id + 1} {unit.is_current && '(当前)'}
                </h3>
                <span className="text-sm text-slate-500">{unit.word_count} 个单词</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {unit.is_completed && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  <span className="text-sm text-slate-600">
                    {unit.is_completed ? '已完成' : unit.is_current ? '进行中' : '未开始'}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStartUnit(unit.unit_id)}
                  disabled={!unit.is_completed && !unit.is_current}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${unit.is_completed || unit.is_current ? 'bg-black text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-500 cursor-not-allowed'}`}
                >
                  {unit.is_completed ? '复习' : '开始学习'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function SentenceTranslationStep({ sentences, onMarkCovered, onBack, t }) {
  const [selectedTokens, setSelectedTokens] = useState([])
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [isCorrect, setIsCorrect] = useState(null)
  
  if (!sentences || sentences.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center py-16">
          <p className="text-lg text-slate-600">没有可学习的句子</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="mt-4 px-6 py-2 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            返回进度页
          </motion.button>
        </div>
      </motion.div>
    )
  }
  
  const currentSentence = sentences[currentSentenceIndex]
  const allTokens = [
    ...currentSentence.translation.split(' '),
    ...currentSentence.distractor_tokens
  ].filter(token => token)
  
  const handleTokenSelect = (token) => {
    setSelectedTokens(prev => [...prev, token])
  }
  
  const handleSubmit = () => {
    const submittedTranslation = selectedTokens.join(' ')
    const isCorrectAnswer = submittedTranslation === currentSentence.translation
    setIsCorrect(isCorrectAnswer)
    
    if (isCorrectAnswer) {
      onMarkCovered(currentSentence.sentence_index)
    }
  }
  
  const handleNext = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1)
      setSelectedTokens([])
      setIsCorrect(null)
    } else {
      onBack()
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      {/* 返回按钮 */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        返回进度页
      </motion.button>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">
          句子翻译 ({currentSentenceIndex + 1}/{sentences.length})
        </h2>
        
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">原文</h3>
          <p className="text-lg text-slate-900">{currentSentence.sentence}</p>
        </div>
        
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">你的翻译</h3>
          <div className="p-4 border border-slate-200 rounded-lg min-h-16 mb-4">
            <p className="text-lg text-slate-900">{selectedTokens.join(' ')}</p>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {allTokens.map((token, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTokenSelect(token)}
                disabled={isCorrect !== null}
                className="px-4 py-2 bg-slate-100 text-slate-900 rounded-md text-sm hover:bg-slate-200 transition-colors"
              >
                {token}
              </motion.button>
            ))}
          </div>
          
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSubmit}
              disabled={isCorrect !== null || selectedTokens.length === 0}
              className="flex-1 py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              提交
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedTokens([])}
              disabled={isCorrect !== null}
              className="px-6 py-3 bg-slate-100 text-slate-900 font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              清空
            </motion.button>
          </div>
        </div>
        
        {isCorrect !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg mb-6 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <h3 className="font-medium text-slate-900">
                {isCorrect ? '正确！' : '错误'}
              </h3>
            </div>
            {!isCorrect && (
              <p className="text-slate-700">
                正确答案: {currentSentence.translation}
              </p>
            )}
          </motion.div>
        )}
        
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleNext}
          disabled={isCorrect === null}
          className="w-full py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentSentenceIndex < sentences.length - 1 ? '下一题' : '完成'}
        </motion.button>
      </div>
    </motion.div>
  )
}

export default App
