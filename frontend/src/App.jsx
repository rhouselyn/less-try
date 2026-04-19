import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ArrowLeft } from 'lucide-react'
import axios from 'axios'

import InputStep from './components/InputStep'
import DictionaryStep from './components/DictionaryStep'
import LearningStep from './components/LearningStep'
import ProgressStep from './components/ProgressStep'
import SentenceTranslationStep from './components/SentenceTranslationStep'

// 语言翻译字典
const translations = {
  zh: {
    title: '少邻国',
    subtitle: 'Lesslingo',
    startLearning: '开始学习',
    inputHint: '输入任意文本，AI 将自动生成单词表和学习资料',
    learnLang: '学习语言',
    nativeLang: '母语',
    inputText: '输入文本',
    placeholder: '粘贴或输入你想学习的文本...',
    processing: '处理中...',
    generateMaterials: '生成学习资料',
    back: '返回',
    startRandomLearn: '开始随机单词学习',
    preparing: '准备中...',
    sentTranslation: '句子翻译',
    vocabList: '单词表',
    wordLabel: '单词',
    meaningLabel: '意思',
    posLabel: '词性',
    definition: '释义',
    variants: '词形变化',
    examples: '例句',
    memoryHint: '记忆辅助',
    originalSent: '原文例句',
    sentDetail: '句子详情',
    original: '原文',
    translation: '翻译',
    grammar: '语法详解',
    backToVocab: '返回单词表',
    loading: '加载中...',
    nextQuestion: '下一题',
    question: '题干',
    correctAnswer: '正确答案',
    options: '选项',
    context: '上下文',
    studyThisWord: '学习这个单词',
    aToZ: 'A → Z',
    zToA: 'Z → A'
  },
  en: {
    title: 'Lesslingo',
    subtitle: '',
    startLearning: 'Start Learning',
    inputHint: 'Enter any text, AI will automatically generate word list and study materials',
    learnLang: 'Learn Language',
    nativeLang: 'Native Language',
    inputText: 'Enter Text',
    placeholder: 'Paste or enter text you want to learn...',
    processing: 'Processing...',
    generateMaterials: 'Generate Study Materials',
    back: 'Back',
    startRandomLearn: 'Start Random Word Learning',
    preparing: 'Preparing...',
    sentTranslation: 'Sentence Translations',
    vocabList: 'Vocabulary List',
    wordLabel: 'Word',
    meaningLabel: 'Meaning',
    posLabel: 'Part of Speech',
    definition: 'Definition',
    variants: 'Word Forms',
    examples: 'Examples',
    memoryHint: 'Memory Hint',
    originalSent: 'Original Sentence',
    sentDetail: 'Sentence Details',
    original: 'Original',
    translation: 'Translation',
    grammar: 'Grammar Explanation',
    backToVocab: 'Back to Vocab List',
    loading: 'Loading...',
    nextQuestion: 'Next Question',
    question: 'Question',
    correctAnswer: 'Correct Answer',
    options: 'Options',
    context: 'Context',
    studyThisWord: 'Study This Word',
    aToZ: 'A → Z',
    zToA: 'Z → A'
  }
}

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
  const t = translations[targetLang] || translations.zh

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
      const wordResponse = await axios.get(`/api/learn/${currentFileId}/random-word`)
      setLearningData(wordResponse.data)
      setShowWordCard(false)
      setSelectedOption(null)
      setIsCorrect(null)
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
      console.error('检查句子覆盖错误:', error)
    }
  }

  const markSentenceCovered = async (sentenceIndex) => {
    if (!currentFileId) return

    try {
      await axios.post(`/api/learn/${currentFileId}/sentence/${sentenceIndex}/mark-covered`)
      // 重新检查覆盖
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

export default App
