import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Loader2, ArrowLeft, Languages, Shuffle, Volume2, ChevronRight, Brain, CheckCircle2, XCircle, PlayCircle, Menu, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
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
  const [displayVocab, setDisplayVocab] = useState([])
  const [wordGroups, setWordGroups] = useState([])
  const [sortOrder, setSortOrder] = useState('asc') // 'asc', 'desc', 'random'
  const [sentenceTranslations, setSentenceTranslations] = useState([])
  const [selectedWord, setSelectedWord] = useState(null)
  const [selectedSentence, setSelectedSentence] = useState(null)
  const [progress, setProgress] = useState(0)
  const [processingInfo, setProcessingInfo] = useState(null)
  const [currentFileId, setCurrentFileId] = useState(null)
  // Quiz state
  const [snapshot, setSnapshot] = useState(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [quizType, setQuizType] = useState('multiple_choice') // 'multiple_choice' or 'matching'
  const [matchingAnswers, setMatchingAnswers] = useState({})
  // Word learning state
  const [learningVocab, setLearningVocab] = useState([])
  const [currentLearningIndex, setCurrentLearningIndex] = useState(0)
  const [learningOptions, setLearningOptions] = useState([])
  const [learningSelectedAnswer, setLearningSelectedAnswer] = useState(null)
  const [learningShowResult, setLearningShowResult] = useState(false)
  const [learningLoading, setLearningLoading] = useState(false)

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

        if (status.word_groups) {
          console.log('更新单词组，数量:', status.word_groups.length)
          setWordGroups([...status.word_groups]) // 使用展开运算符强制更新
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
          if (status.word_groups) {
            console.log('处理完成，单词组数量:', status.word_groups.length)
            setWordGroups([...status.word_groups])
          }
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
    if (sortOrder === 'random') {
      const shuffled = [...vocab].sort(() => Math.random() - 0.5)
      setDisplayVocab(shuffled)
    } else {
      const sorted = [...vocab].sort((a, b) => {
        const wordA = a.word.toLowerCase()
        const wordB = b.word.toLowerCase()
        return sortOrder === 'asc' ? wordA.localeCompare(wordB) : wordB.localeCompare(wordA)
      })
      setDisplayVocab(sorted)
    }
  }

  const toggleSortOrder = () => {
    setSortOrder(prev => {
      if (prev === 'asc') return 'desc'
      if (prev === 'desc') return 'random'
      return 'asc'
    })
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

  const handleCreateSnapshot = async () => {
    if (!fileId) return
    
    setQuizLoading(true)
    try {
      const response = await axios.post(`/api/create-snapshot/${fileId}`, {})
      console.log('Snapshot created:', response.data)
      setSnapshot(response.data.snapshot)
      setStep('quiz')
    } catch (error) {
      console.error('Error creating snapshot:', error)
      alert('创建快照失败，请重试')
    } finally {
      setQuizLoading(false)
    }
  }

  const handleLoadSnapshot = async () => {
    if (!fileId) return
    
    setQuizLoading(true)
    try {
      const response = await axios.get(`/api/snapshot/${fileId}`)
      console.log('Snapshot loaded:', response.data)
      setSnapshot(response.data.snapshot)
      setStep('quiz')
    } catch (error) {
      console.error('Error loading snapshot:', error)
      if (error.response && error.response.status === 404) {
        // Snapshot not found, create one
        await handleCreateSnapshot()
      } else {
        alert('加载快照失败，请重试')
      }
    } finally {
      setQuizLoading(false)
    }
  }

  const handleStartQuiz = () => {
    if (!snapshot) {
      handleLoadSnapshot()
    } else {
      setStep('quiz')
    }
  }

  const handleQuizNavigation = (direction) => {
    if (direction === 'next') {
      setCurrentQuestionIndex(prev => Math.min(prev + 1, getCurrentQuizLength() - 1))
    } else if (direction === 'prev') {
      setCurrentQuestionIndex(prev => Math.max(prev - 1, 0))
    }
    setSelectedAnswer(null)
    setShowResult(false)
  }

  const getCurrentQuizLength = () => {
    if (!snapshot) return 0
    return quizType === 'multiple_choice' ? snapshot.multiple_choice.length : snapshot.matching.length
  }

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer)
    setShowResult(true)
    
    // Check if answer is correct
    const currentQuestions = quizType === 'multiple_choice' ? snapshot.multiple_choice : snapshot.matching
    const currentQuestion = currentQuestions[currentQuestionIndex]
    if (answer === currentQuestion.correct_answer) {
      setScore(prev => prev + 1)
    }
  }

  const handleMatchingAnswer = (questionId, answerId) => {
    setMatchingAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }))
  }

  const handleSubmitMatching = () => {
    // Calculate score for matching questions
    const currentQuestions = snapshot.matching
    let matchingScore = 0
    
    currentQuestions.forEach(question => {
      if (matchingAnswers[question.id] === question.correct_answer) {
        matchingScore++
      }
    })
    
    setScore(matchingScore)
    setShowResult(true)
  }

  const resetQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setScore(0)
    setMatchingAnswers({})
  }

  const switchQuizType = (type) => {
    setQuizType(type)
    resetQuiz()
  }

  const handleStartLearning = async () => {
    if (!vocab.length) return
    
    setLearningLoading(true)
    try {
      // 随机排序词汇
      const shuffledVocab = [...vocab].sort(() => Math.random() - 0.5)
      setLearningVocab(shuffledVocab)
      setCurrentLearningIndex(0)
      
      // 提前生成第一个单词的选项
      await generateWordOptions(shuffledVocab[0])
      
      setStep('learning')
    } catch (error) {
      console.error('开始学习失败:', error)
      alert('开始学习失败，请重试')
    } finally {
      setLearningLoading(false)
    }
  }

  const generateWordOptions = async (word) => {
    try {
      // 生成4个选项：1个正确，3个错误
      const correctMeaning = word.context_meaning
      const allMeanings = vocab.map(w => w.context_meaning).filter(m => m !== correctMeaning)
      
      // 随机选择3个错误选项
      const shuffledMeanings = allMeanings.sort(() => Math.random() - 0.5)
      const wrongMeanings = shuffledMeanings.slice(0, 3)
      
      // 组合选项并随机排序
      const options = [correctMeaning, ...wrongMeanings].sort(() => Math.random() - 0.5)
      setLearningOptions(options)
    } catch (error) {
      console.error('生成选项失败:', error)
    }
  }

  const handleLearningAnswerSelect = (answer) => {
    const currentWord = learningVocab[currentLearningIndex]
    setLearningSelectedAnswer(answer)
    setLearningShowResult(true)
  }

  const handleLearningNavigation = async (direction) => {
    if (direction === 'next') {
      const nextIndex = currentLearningIndex + 1
      if (nextIndex < learningVocab.length) {
        setCurrentLearningIndex(nextIndex)
        setLearningSelectedAnswer(null)
        setLearningShowResult(false)
        // 提前生成下一个单词的选项
        await generateWordOptions(learningVocab[nextIndex])
      } else {
        // 学习完成，返回单词表
        setStep('dictionary')
      }
    } else if (direction === 'prev') {
      const prevIndex = currentLearningIndex - 1
      if (prevIndex >= 0) {
        setCurrentLearningIndex(prevIndex)
        setLearningSelectedAnswer(null)
        setLearningShowResult(false)
        // 重新生成当前单词的选项
        await generateWordOptions(learningVocab[prevIndex])
      }
    }
  }

  const handleLearningBack = () => {
    setStep('dictionary')
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
            <>
              {selectedSentence !== null && (
                <SentenceDetail
                  key={`sentence-${selectedSentence}`}
                  sentenceTranslation={sentenceTranslations[selectedSentence]}
                  onClose={handleCloseSentenceDetail}
                />
              )}
              <DictionaryStep
                key="dictionary"
                vocab={displayVocab}
                wordGroups={wordGroups}
                onToggleSort={toggleSortOrder}
                sortOrder={sortOrder}
                progress={progress}
                processingInfo={processingInfo}
                sentenceTranslations={sentenceTranslations}
                onSentenceClick={handleSentenceClick}
                onWordSelect={setSelectedWord}
                selectedWord={selectedWord}
                onStartQuiz={handleStartQuiz}
                quizLoading={quizLoading}
                onStartLearning={handleStartLearning}
                learningLoading={learningLoading}
              />
            </>
          )}
          
          {step === 'quiz' && snapshot && (
            <QuizStep
              key="quiz"
              snapshot={snapshot}
              currentQuestionIndex={currentQuestionIndex}
              selectedAnswer={selectedAnswer}
              showResult={showResult}
              score={score}
              quizType={quizType}
              matchingAnswers={matchingAnswers}
              onAnswerSelect={handleAnswerSelect}
              onMatchingAnswer={handleMatchingAnswer}
              onSubmitMatching={handleSubmitMatching}
              onNavigation={handleQuizNavigation}
              onSwitchType={switchQuizType}
              onBack={() => setStep('dictionary')}
            />
          )}
          
          {step === 'learning' && learningVocab.length > 0 && (
            <LearningStep
              key="learning"
              vocab={learningVocab}
              currentIndex={currentLearningIndex}
              options={learningOptions}
              selectedAnswer={learningSelectedAnswer}
              showResult={learningShowResult}
              loading={learningLoading}
              onAnswerSelect={handleLearningAnswerSelect}
              onNavigation={handleLearningNavigation}
              onBack={handleLearningBack}
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

function DictionaryStep({ vocab, wordGroups, onToggleSort, sortOrder, progress, processingInfo, sentenceTranslations, onSentenceClick, onWordSelect, selectedWord, onStartQuiz, quizLoading, onStartLearning, learningLoading }) {
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
            <span className="text-sm text-slate-600">处理中: 句子 {processingInfo.current} / {processingInfo.total}</span>
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

      {/* 双列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧单词列表 */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              单词表 ({vocab.length})
            </h2>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleSort}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
              >
                {sortOrder === 'asc' && (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    A → Z
                  </>
                )}
                {sortOrder === 'desc' && (
                  <>
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Z → A
                  </>
                )}
                {sortOrder === 'random' && (
                  <>
                    <Shuffle className="w-4 h-4" />
                    随机
                  </>
                )}
              </motion.button>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[calc(100vh-320px)] overflow-y-auto">
            <div className="divide-y divide-slate-200">
              {vocab.map((word, index) => (
                <motion.div
                  key={word.word || index}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${selectedWord?.word === word.word ? 'bg-slate-100' : ''}`}
                  onClick={() => onWordSelect(word)}
                >
                  <div className="font-medium text-slate-900">{word.word}</div>
                  <div className="text-sm text-slate-600">{word.context_meaning}</div>
                  {word.morphology && (
                    <div className="text-xs text-slate-500 font-mono mt-1">{word.morphology}</div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧单词详情 */}
        <div className="lg:col-span-2">
          {selectedWord ? (
            <WordDetail word={selectedWord} />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm h-[calc(100vh-320px)] flex items-center justify-center"
            >
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">选择一个单词</h3>
                <p className="text-slate-500">点击左侧列表中的单词查看详细信息</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* 句子列表 */}
      {safeSentenceTranslations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">句子翻译</h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-200">
              {safeSentenceTranslations.map((item, index) => (
                <motion.div
                  key={index}
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
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 10-word groups */}
      {wordGroups && wordGroups.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            单词分组 ({wordGroups.length} 组)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wordGroups.map((group, groupIndex) => (
              <motion.div
                key={groupIndex}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.05 }}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
              >
                <h3 className="font-medium text-slate-900 mb-3">组 {groupIndex + 1}</h3>
                <div className="space-y-2">
                  {group.map((word, wordIndex) => (
                    <div key={wordIndex} className="flex items-center justify-between">
                      <div className="font-medium text-slate-900">{word.word}</div>
                      <div className="text-slate-700">{word.context_meaning}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Learning and Quiz buttons */}
      {wordGroups && wordGroups.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onStartLearning}
            disabled={learningLoading}
            className="w-full py-4 bg-black text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {learningLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                准备中...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                开始学习
              </>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onStartQuiz}
            disabled={quizLoading}
            className="w-full py-4 bg-slate-100 text-slate-900 font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {quizLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                准备中...
              </>
            ) : (
              <>
                <PlayCircle className="w-5 h-5" />
                开始测验
              </>
            )}
          </motion.button>
        </motion.div>
      )}
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

function SentenceDetail({ sentenceTranslation, onClose }) {
  const sentence = sentenceTranslation?.sentence
  const translationResult = sentenceTranslation?.translation_result
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm"
    >
      <div className="flex items-center justify-between mb-8">
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-semibold text-slate-900"
        >
          句子详情
        </motion.h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
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
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            原文
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
            翻译
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {translationResult?.tokenized_translation || '翻译中...'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            语法详解
          </h3>
          <p className="text-lg text-slate-700 leading-relaxed">
            {translationResult?.grammar_explanation || '语法分析中...'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

function QuizStep({ 
  snapshot, 
  currentQuestionIndex, 
  selectedAnswer, 
  showResult, 
  score, 
  quizType, 
  matchingAnswers, 
  onAnswerSelect, 
  onMatchingAnswer, 
  onSubmitMatching, 
  onNavigation, 
  onSwitchType, 
  onBack 
}) {
  const currentQuestions = quizType === 'multiple_choice' ? snapshot.multiple_choice : snapshot.matching
  const currentQuestion = currentQuestions[currentQuestionIndex]
  const totalQuestions = currentQuestions.length

  const getAnswerClass = (answer) => {
    if (!showResult) return ''
    if (answer === currentQuestion.correct_answer) return 'bg-green-100 border-green-500 text-green-700'
    if (answer === selectedAnswer && answer !== currentQuestion.correct_answer) return 'bg-red-100 border-red-500 text-red-700'
    return ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      {/* Quiz header */}
      <div className="flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          返回单词表
        </motion.button>
        
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSwitchType('multiple_choice')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              quizType === 'multiple_choice' 
                ? 'bg-black text-white' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            选择题
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSwitchType('matching')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              quizType === 'matching' 
                ? 'bg-black text-white' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            匹配题
          </motion.button>
        </div>
      </div>

      {/* Quiz content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        {/* Progress */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-slate-900">
            {quizType === 'multiple_choice' ? '选择题' : '匹配题'}
          </h2>
          <div className="text-slate-600">
            {currentQuestionIndex + 1} / {totalQuestions}
          </div>
        </div>

        {/* Question */}
        {quizType === 'multiple_choice' ? (
          /* Multiple Choice Question */
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-medium text-slate-900 mb-6"
            >
              {currentQuestion.question}
            </motion.div>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onAnswerSelect(option)}
                  disabled={showResult}
                  className={`w-full text-left px-6 py-4 border rounded-lg transition-colors ${
                    getAnswerClass(option)
                  }`}
                >
                  {option}
                </motion.button>
              ))}
            </div>

            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <p className="text-slate-700">
                  <strong>正确答案:</strong> {currentQuestion.correct_answer}
                </p>
                {currentQuestion.explanation && (
                  <p className="mt-2 text-slate-600 text-sm">
                    <strong>解析:</strong> {currentQuestion.explanation}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        ) : (
          /* Matching Question */
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-medium text-slate-900 mb-6"
            >
              {currentQuestion.question}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Questions */}
              <div className="space-y-3">
                <h3 className="font-medium text-slate-700 mb-2">词汇</h3>
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                    {option}
                  </div>
                ))}
              </div>

              {/* Answers */}
              <div className="space-y-3">
                <h3 className="font-medium text-slate-700 mb-2">释义</h3>
                {currentQuestion.answers.map((answer, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onMatchingAnswer(currentQuestion.id, answer)}
                    disabled={showResult}
                    className={`w-full text-left px-4 py-4 border rounded-lg transition-colors ${
                      showResult && matchingAnswers[currentQuestion.id] === answer
                        ? matchingAnswers[currentQuestion.id] === currentQuestion.correct_answer
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : 'bg-red-100 border-red-500 text-red-700'
                        : ''
                    }`}
                  >
                    {answer}
                  </motion.button>
                ))}
              </div>
            </div>

            {!showResult && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={onSubmitMatching}
                className="w-full py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors mt-4"
              >
                提交答案
              </motion.button>
            )}

            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <p className="text-slate-700">
                  <strong>正确答案:</strong> {currentQuestion.correct_answer}
                </p>
                {currentQuestion.explanation && (
                  <p className="mt-2 text-slate-600 text-sm">
                    <strong>解析:</strong> {currentQuestion.explanation}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigation('prev')}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            上一题
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigation('next')}
            disabled={currentQuestionIndex === totalQuestions - 1}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一题
            <ChevronRightIcon className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Score */}
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 bg-slate-100 rounded-lg text-center"
          >
            <p className="text-lg font-medium text-slate-900">
              得分: {score} / {totalQuestions}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function LearningStep({ 
  vocab, 
  currentIndex, 
  options, 
  selectedAnswer, 
  showResult, 
  loading, 
  onAnswerSelect, 
  onNavigation, 
  onBack 
}) {
  const currentWord = vocab[currentIndex]
  const totalWords = vocab.length

  const getAnswerClass = (answer) => {
    if (!showResult) return ''
    if (answer === currentWord.context_meaning) return 'bg-green-100 border-green-500 text-green-700'
    if (answer === selectedAnswer && answer !== currentWord.context_meaning) return 'bg-red-100 border-red-500 text-red-700'
    return ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      {/* Learning header */}
      <div className="flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          返回单词表
        </motion.button>
        <div className="text-slate-600">
          {currentIndex + 1} / {totalWords}
        </div>
      </div>

      {/* Learning content */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        {/* Word display */}
        <div className="text-center mb-8">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl font-semibold text-slate-900 mb-2"
          >
            {currentWord.word}
          </motion.h2>
          {currentWord.ipa && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-slate-500 font-mono mb-4"
            >
              /{currentWord.ipa}/
            </motion.p>
          )}
        </div>

        {/* Question */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg font-medium text-slate-900 mb-6 text-center"
        >
          选择正确的释义
        </motion.div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onAnswerSelect(option)}
              disabled={showResult || loading}
              className={`w-full text-left px-6 py-4 border rounded-lg transition-colors ${
                getAnswerClass(option)
              }`}
            >
              {option}
            </motion.button>
          ))}
        </div>

        {/* Result */}
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200"
          >
            <p className="text-slate-700">
              <strong>正确答案:</strong> {currentWord.context_meaning}
            </p>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onNavigation('prev')}
            disabled={currentIndex === 0 || loading}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            上一个
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onNavigation('next')}
            disabled={currentIndex === totalWords - 1 || loading}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一个
            <ChevronRightIcon className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default App
