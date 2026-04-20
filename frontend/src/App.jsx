import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ArrowLeft, Home } from 'lucide-react'
import { api } from './utils/api'
import { translations } from './utils/translations'

// 导入组件
import InputStep from './components/InputStep'
import DictionaryStep from './components/DictionaryStep'
import LearningStep from './components/LearningStep'
import ProgressStep from './components/ProgressStep'
import SentenceQuizStep from './components/SentenceQuizStep'
import HomePage from './components/HomePage'
import LanguageDetailPage from './components/LanguageDetailPage'

function App() {
  const [page, setPage] = useState('home') // 'home', 'language', 'input', 'dictionary', 'progress', 'learning', 'sentence-quiz'
  const [selectedLanguage, setSelectedLanguage] = useState(null)
  const [text, setText] = useState('')
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('zh')
  const [nativeLang, setNativeLang] = useState('zh')
  const [loading, setLoading] = useState(false)
  const [fileId, setFileId] = useState(null)
  const [vocab, setVocab] = useState([])
  const [displayVocab, setDisplayVocab] = useState([])
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' or 'desc'
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
  const [units, setUnits] = useState([])
  const [currentUnit, setCurrentUnit] = useState(0)
  const [totalUnits, setTotalUnits] = useState(0)
  const [allUnitsCompleted, setAllUnitsCompleted] = useState(false)
  const [quizData, setQuizData] = useState(null)
  const [learningMode, setLearningMode] = useState('word') // 'word' or 'sentence'

  // 获取当前语言的翻译
  const t = translations[nativeLang] || translations.zh

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
        const status = await api.getStatus(currentFileId)
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
    setPage('dictionary')
    
    try {
      console.log('开始处理文本，长度:', text.length)
      const response = await api.processText(text, sourceLang, targetLang)
      
      console.log('API响应:', response)
      if (response && response.file_id) {
        const fileId = response.file_id
        setFileId(fileId)
        setCurrentFileId(fileId)
        console.log('获取到文件ID:', fileId)
      } else {
        throw new Error('无效的API响应')
      }
    } catch (error) {
      console.error('处理文本错误:', error)
      if (error.response && error.response.status === 504) {
        alert('网络连接超时，请检查网络连接后重试')
      } else if (error.message && error.message.includes('timeout')) {
        alert('处理超时，请稍后重试')
      } else {
        alert('处理失败，请重试')
      }
      setLoading(false)
    }
  }

  const handleSelectLanguage = (lang) => {
    setSelectedLanguage(lang)
    setPage('language')
  }

  const handleNewParagraph = () => {
    if (selectedLanguage) {
      setTargetLang(selectedLanguage)
    }
    setText('')
    setPage('input')
  }

  const handleArticleClick = (article) => {
    setFileId(article.fileId)
    setCurrentFileId(article.fileId)
    setSourceLang(article.sourceLang)
    setTargetLang(article.targetLang)
    
    const loadArticleData = async () => {
      try {
        const response = await api.getVocab(article.fileId)
        setVocab(response.vocab)
      } catch (error) {
        console.error('加载文章数据错误:', error)
      }
    }
    loadArticleData()
    
    setPage('dictionary')
  }

  const startLearning = async () => {
    if (!currentFileId) return
    
    setLoading(true)
    try {
      const progressData = await api.getLearningProgress(currentFileId)
      setUnits(progressData.units)
      setCurrentUnit(progressData.current_unit)
      setTotalUnits(progressData.total_units)
      setAllUnitsCompleted(progressData.all_units_completed)
      setPage('progress')
    } catch (error) {
      console.error('开始学习错误:', error)
      alert('无法开始学习，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleUnitClick = async (unitIndex) => {
    setLoading(true)
    try {
      const startIndex = unitIndex * 10
      await api.setProgress(currentFileId, startIndex)
      const response = await api.getRandomWord(currentFileId)
      setLearningData(response)
      setShowWordCard(false)
      setSelectedOption(null)
      setIsCorrect(null)
      setLearningMode('word')
      setPage('learning')
    } catch (error) {
      console.error('获取单元单词错误:', error)
      alert('无法获取单元单词，请重试')
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
      const nextWordResponse = await api.nextWord(currentFileId)
      const newIndex = nextWordResponse.new_index
      
      const vocabResponse = await api.getVocab(currentFileId)
      const vocabLength = vocabResponse.vocab.length
      
      const allWordsLearned = newIndex >= vocabLength
      
      if (allWordsLearned) {
        const coverageData = await api.checkCoverage(currentFileId)
        if (coverageData.can_form_sentences) {
          const quizResponse = await api.generateSentenceQuiz(currentFileId)
          setQuizData({
            ...quizResponse,
            unit_completed: coverageData.unit_completed
          })
          setLearningMode('sentence')
          setPage('sentence-quiz')
        } else {
          alert('该单元学习已完成！')
          setPage('progress')
        }
        return
      }
      
      const coverageData = await api.checkCoverage(currentFileId)
      if (coverageData.can_form_sentences) {
        const quizResponse = await api.generateSentenceQuiz(currentFileId)
        setQuizData({
          ...quizResponse,
          unit_completed: coverageData.unit_completed
        })
        setLearningMode('sentence')
        setPage('sentence-quiz')
      } else if (coverageData.unit_completed) {
        alert('该单元学习已完成！')
        setPage('progress')
      } else {
        const response = await api.getRandomWord(currentFileId)
        setLearningData(response)
        setShowWordCard(false)
        setSelectedOption(null)
        setIsCorrect(null)
      }
    } catch (error) {
      console.error('获取下一个单词错误:', error)
      alert('无法获取下一个单词，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getWordDetails = async (word) => {
    if (!currentFileId) return
    
    if (selectedWord && selectedWord.word === word) {
      setSelectedWord(null)
      return
    }
    
    try {
      const response = await api.getWordDetails(currentFileId, word)
      setSelectedWord(response)
    } catch (error) {
      console.error('获取单词详情错误:', error)
    }
  }

  const handleStudyWord = (wordData) => {
    setLearningData(wordData)
    setShowWordCard(false)
    setSelectedOption(null)
    setIsCorrect(null)
    setPage('learning')
  }

  const handleNextSentenceQuiz = async () => {
    setLoading(true)
    try {
      const coverageData = await api.checkCoverage(currentFileId)
      if (coverageData.can_form_sentences) {
        const quizResponse = await api.generateSentenceQuiz(currentFileId)
        setQuizData({
          ...quizResponse,
          unit_completed: coverageData.unit_completed
        })
      } else if (coverageData.unit_completed) {
        alert('该单元学习已完成！')
        setPage('progress')
      } else {
        const response = await api.getRandomWord(currentFileId)
        setLearningData(response)
        setShowWordCard(false)
        setSelectedOption(null)
        setIsCorrect(null)
        setLearningMode('word')
        setPage('learning')
      }
    } catch (error) {
      console.error('获取下一个句子翻译题错误:', error)
      alert('无法获取下一个句子翻译题，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (page === 'language') {
      setPage('home')
    } else if (page === 'input') {
      setPage(selectedLanguage ? 'language' : 'home')
    } else if (page === 'dictionary') {
      if (selectedLanguage) {
        setPage('language')
      } else {
        setPage('home')
      }
    } else if (page === 'learning' || page === 'sentence-quiz' || page === 'progress') {
      setPage('dictionary')
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
              {page !== 'home' && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100"
                >
                  {page === 'language' ? (
                    <>
                      <Home className="w-4 h-4" />
                      {t.home}
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="w-4 h-4" />
                      {t.back}
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {page === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HomePage
                t={t}
                nativeLang={nativeLang}
                onSelectLanguage={handleSelectLanguage}
                onNewParagraph={() => handleNewParagraph()}
              />
            </motion.div>
          )}

          {page === 'language' && (
            <motion.div key="language" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LanguageDetailPage
                t={t}
                language={selectedLanguage}
                nativeLang={nativeLang}
                setNativeLang={setNativeLang}
                onBack={handleBack}
                onNewParagraph={handleNewParagraph}
                onArticleClick={handleArticleClick}
              />
            </motion.div>
          )}

          {page === 'input' && (
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
          
          {page === 'dictionary' && (
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
            />
          )}
          
          {page === 'progress' && (
            <ProgressStep
              key="progress"
              units={units}
              currentUnit={currentUnit}
              onUnitClick={handleUnitClick}
              onBack={() => setPage('dictionary')}
              loading={loading}
              t={t}
              allUnitsCompleted={allUnitsCompleted}
            />
          )}
          
          {page === 'learning' && (
            <LearningStep
              key="learning"
              learningData={learningData}
              showWordCard={showWordCard}
              selectedOption={selectedOption}
              isCorrect={isCorrect}
              onOptionSelect={handleOptionSelect}
              onNextWord={getNextWord}
              onBack={() => setPage('dictionary')}
              loading={loading}
              t={t}
            />
          )}
          
          {page === 'sentence-quiz' && (
            <SentenceQuizStep
              key="sentence-quiz"
              quizData={quizData}
              onNextQuestion={handleNextSentenceQuiz}
              onBack={() => setPage('dictionary')}
              onComplete={() => setPage('progress')}
              loading={loading}
              t={t}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
