import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ArrowLeft } from 'lucide-react'
import { api } from './utils/api'
import { translations } from './utils/translations'

// 导入组件
import InputStep from './components/InputStep'
import DictionaryStep from './components/DictionaryStep'
import LearningStep from './components/LearningStep'
import ProgressStep from './components/ProgressStep'
import SentenceQuizStep from './components/SentenceQuizStep'
import PhaseSelectorStep from './components/PhaseSelectorStep'
import PhaseProgressStep from './components/PhaseProgressStep'
import MaskedSentenceExerciseStep from './components/MaskedSentenceExerciseStep'
import TranslationReconstructionStep from './components/TranslationReconstructionStep'

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
  const [units, setUnits] = useState([])
  const [currentUnit, setCurrentUnit] = useState(0)
  const [totalUnits, setTotalUnits] = useState(0)
  const [allUnitsCompleted, setAllUnitsCompleted] = useState(false)
  const [quizData, setQuizData] = useState(null)
  const [learningMode, setLearningMode] = useState('word') // 'word' or 'sentence'
  const [errorMessage, setErrorMessage] = useState(null)
  
  // New states for phases
  const [phases, setPhases] = useState([])
  const [currentPhase, setCurrentPhase] = useState(null)
  const [phaseUnits, setPhaseUnits] = useState([])
  const [currentPhaseUnit, setCurrentPhaseUnit] = useState(0)
  const [currentExerciseData, setCurrentExerciseData] = useState(null)
  const [exerciseType, setExerciseType] = useState(null)
  
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
          setErrorMessage(`处理失败: ${status.error}`)
          setLoading(false)
          // 停止轮询
          if (pollingInterval) {
            clearInterval(pollingInterval)
          }
        } else if (pollCount >= maxPolls) {
          console.error('轮询超时')
          setErrorMessage('处理超时，请重试')
          setLoading(false)
          // 停止轮询
          if (pollingInterval) {
            clearInterval(pollingInterval)
          }
        }
      } catch (error) {
        console.error('轮询错误:', error)
        if (pollCount >= maxPolls) {
          setErrorMessage('网络错误，请重试')
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
        // 504错误表示网关超时，可能是网络延迟或后端处理时间过长
        setErrorMessage('网络连接超时，请检查网络连接后重试')
      } else if (error.message && error.message.includes('timeout')) {
        // 处理超时错误
        setErrorMessage('处理超时，请稍后重试')
      } else {
        // 其他错误
        setErrorMessage('处理失败，请重试')
      }
      setLoading(false)
    }
  }

  const startLearning = async () => {
    if (!currentFileId) return
    
    setLoading(true)
    try {
      // 获取学习进度和分组信息
      const progressData = await api.getLearningProgress(currentFileId)
      setUnits(progressData.units)
      setCurrentUnit(progressData.current_unit)
      setTotalUnits(progressData.total_units)
      setAllUnitsCompleted(progressData.all_units_completed)
      setStep('progress')
    } catch (error) {
      console.error('开始学习错误:', error)
      setErrorMessage('无法开始学习，请重试')
    } finally {
      setLoading(false)
    }
  }

  const startLearningPhases = async () => {
    if (!currentFileId) return
    
    setLoading(true)
    try {
      const phasesData = await api.getPhases(currentFileId)
      setPhases(phasesData.phases)
      setStep('phase-selector')
    } catch (error) {
      console.error('获取阶段错误:', error)
      setErrorMessage('无法获取学习阶段，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handlePhaseSelect = async (phaseNumber) => {
    if (!currentFileId) return
    
    setLoading(true)
    try {
      setCurrentPhase(phaseNumber)
      if (phaseNumber === 1) {
        // Phase1 is original word learning
        const progressData = await api.getLearningProgress(currentFileId)
        setUnits(progressData.units)
        setCurrentUnit(progressData.current_unit)
        setTotalUnits(progressData.total_units)
        setAllUnitsCompleted(progressData.all_units_completed)
        setStep('progress')
      } else {
        const phaseUnitsData = await api.getPhaseUnits(currentFileId, phaseNumber)
        setPhaseUnits(phaseUnitsData.units)
        setCurrentPhaseUnit(phaseUnitsData.current_unit)
        setStep('phase-progress')
      }
    } catch (error) {
      console.error('选择阶段错误:', error)
      setErrorMessage('无法选择阶段，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handlePhaseUnitClick = async (unitId) => {
    if (!currentFileId || !currentPhase) return
    
    setLoading(true)
    try {
      setCurrentPhaseUnit(unitId)
      const exerciseData = await api.getPhaseUnitExercise(currentFileId, currentPhase, unitId)
      if (exerciseData.unit_complete) {
        setErrorMessage('该单元已完成！')
        setStep('phase-progress')
      } else if (exerciseData.redirect_to_phase1) {
        setStep('progress')
      } else {
        setExerciseType(exerciseData.exercise_type)
        setCurrentExerciseData(exerciseData.data)
        setStep('phase-exercise')
      }
    } catch (error) {
      console.error('获取单元练习错误:', error)
      setErrorMessage('无法获取练习，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleNextPhaseExercise = async () => {
    if (!currentFileId || !currentPhase) return
    
    setLoading(true)
    try {
      const nextRes = await api.nextPhaseExercise(currentFileId, currentPhase, currentPhaseUnit)
      if (nextRes.unit_complete) {
        setErrorMessage('该单元已完成！')
        // Refresh phase units
        const phaseUnitsData = await api.getPhaseUnits(currentFileId, currentPhase)
        setPhaseUnits(phaseUnitsData.units)
        setCurrentPhaseUnit(phaseUnitsData.current_unit)
        setStep('phase-progress')
      } else {
        // Get next exercise
        const exerciseData = await api.getPhaseUnitExercise(currentFileId, currentPhase, currentPhaseUnit)
        if (exerciseData.unit_complete) {
          setErrorMessage('该单元已完成！')
          setStep('phase-progress')
        } else {
          setExerciseType(exerciseData.exercise_type)
          setCurrentExerciseData(exerciseData.data)
        }
      }
    } catch (error) {
      console.error('下一个练习错误:', error)
      setErrorMessage('无法获取下一个练习，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleUnitClick = async (unitIndex) => {
    setLoading(true)
    try {
      // 计算该单元的起始学习索引
      const startIndex = unitIndex * 10
      // 设置学习进度到该单元的起始位置
      await api.setProgress(currentFileId, startIndex)
      // 获取第一个单词
      const response = await api.getRandomWord(currentFileId)
      setLearningData(response)
      setShowWordCard(false)
      setSelectedOption(null)
      setIsCorrect(null)
      setLearningMode('word')
      setStep('learning')
    } catch (error) {
      console.error('获取单元单词错误:', error)
      setErrorMessage('无法获取单元单词，请重试')
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
      const nextWordResponse = await api.nextWord(currentFileId)
      const newIndex = nextWordResponse.new_index
      
      // 获取词汇表长度
      const vocabResponse = await api.getVocab(currentFileId)
      const vocabLength = vocabResponse.vocab.length
      
      // 检查是否学习完所有单词
      const allWordsLearned = newIndex >= vocabLength
      
      if (allWordsLearned) {
        // 检查是否可以生成句子翻译题
        const coverageData = await api.checkCoverage(currentFileId)
        if (coverageData.can_form_sentences) {
          // 生成句子翻译题
          const quizResponse = await api.generateSentenceQuiz(currentFileId)
          setQuizData({
            ...quizResponse,
            unit_completed: coverageData.unit_completed
          })
          setLearningMode('sentence')
          setStep('sentence-quiz')
        } else {
          // 单元已完成
          alert('该单元学习已完成！')
          setStep('progress')
        }
        return
      }
      
      // 检查是否需要插入句子翻译题
      const coverageData = await api.checkCoverage(currentFileId)
      if (coverageData.can_form_sentences) {
        // 生成句子翻译题
        const quizResponse = await api.generateSentenceQuiz(currentFileId)
        setQuizData({
          ...quizResponse,
          unit_completed: coverageData.unit_completed
        })
        setLearningMode('sentence')
        setStep('sentence-quiz')
      } else if (coverageData.unit_completed) {
        // 单元已完成
        alert('该单元学习已完成！')
        setStep('progress')
      } else {
        // 继续单词学习
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
    
    // 如果点击的是当前选中的单词，则取消选中
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
    setStep('learning')
  }

  const handleNextSentenceQuiz = async () => {
    setLoading(true)
    try {
      // 检查是否还有可组成的句子
      const coverageData = await api.checkCoverage(currentFileId)
      if (coverageData.can_form_sentences) {
        // 生成下一个句子翻译题
        const quizResponse = await api.generateSentenceQuiz(currentFileId)
        setQuizData({
          ...quizResponse,
          unit_completed: coverageData.unit_completed
        })
      } else if (coverageData.unit_completed) {
        // 单元已完成
        alert('该单元学习已完成！')
        setStep('progress')
      } else {
        // 回到单词学习
        const response = await api.getRandomWord(currentFileId)
        setLearningData(response)
        setShowWordCard(false)
        setSelectedOption(null)
        setIsCorrect(null)
        setLearningMode('word')
        setStep('learning')
      }
    } catch (error) {
      console.error('获取下一个句子翻译题错误:', error)
      alert('无法获取下一个句子翻译题，请重试')
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
                <h1 className="text-xl font-semibold text-slate-900">{t.title}</h1>
                <p className="text-sm text-slate-500">{t.subtitle || 'Lesslingo'}</p>
              </div>
            </div>
            <AnimatePresence>
              {step !== 'input' && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => {
                    if (step === 'learning' || step === 'sentence-quiz' || step === 'progress') {
                      setStep('dictionary');
                    } else {
                      setStep('input');
                    }
                  }}
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
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {errorMessage}
            <button 
              onClick={() => setErrorMessage(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}
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
              onStartLearning={startLearningPhases}
              loading={loading}
              t={t}
            />
          )}
          
          {step === 'progress' && (
            <ProgressStep
              key="progress"
              units={units}
              currentUnit={currentUnit}
              onUnitClick={handleUnitClick}
              onBack={() => setStep('dictionary')}
              loading={loading}
              t={t}
              allUnitsCompleted={allUnitsCompleted}
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
              onBack={() => setStep('dictionary')}
              loading={loading}
              t={t}
            />
          )}
          
          {step === 'sentence-quiz' && (
            <SentenceQuizStep
              key="sentence-quiz"
              quizData={quizData}
              onNextQuestion={handleNextSentenceQuiz}
              onBack={() => setStep('dictionary')}
              onComplete={() => setStep('progress')}
              loading={loading}
              t={t}
            />
          )}
          
          {step === 'phase-selector' && (
            <PhaseSelectorStep
              key="phase-selector"
              phases={phases}
              currentFileId={currentFileId}
              onPhaseSelect={handlePhaseSelect}
              onBack={() => setStep('dictionary')}
              loading={loading}
              t={t}
            />
          )}
          
          {step === 'phase-progress' && (
            <PhaseProgressStep
              key="phase-progress"
              units={phaseUnits}
              currentUnit={currentPhaseUnit}
              phaseNumber={currentPhase}
              onUnitClick={handlePhaseUnitClick}
              onBack={() => setStep('phase-selector')}
              loading={loading}
              t={t}
            />
          )}
          
          {step === 'phase-exercise' && exerciseType === 'masked_sentence' && (
            <MaskedSentenceExerciseStep
              key="masked-exercise"
              data={currentExerciseData}
              onNext={handleNextPhaseExercise}
              onBack={() => setStep('phase-progress')}
              loading={loading}
              t={t}
            />
          )}
          
          {step === 'phase-exercise' && exerciseType === 'translation_reconstruction' && (
            <TranslationReconstructionStep
              key="reconstruction-exercise"
              data={currentExerciseData}
              onNext={handleNextPhaseExercise}
              onBack={() => setStep('phase-progress')}
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