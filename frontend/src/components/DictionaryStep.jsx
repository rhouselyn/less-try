import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shuffle, Loader2, Languages, BookOpen } from 'lucide-react'
import WordDetail from './WordDetail'
import SentenceDetail from './SentenceDetail'

function DictionaryStep({ vocab, onToggleSort, sortOrder, progress, processingInfo, sentenceTranslations, selectedSentence, selectedWord, onSentenceClick, onCloseSentenceDetail, onWordClick, onStartLearning, loading, t }) {
  const [activeTab, setActiveTab] = useState('sentences')

  const safeSentenceTranslations = Array.isArray(sentenceTranslations) ? sentenceTranslations : []
  const safeProcessingInfo = processingInfo || { current: 0, total: 1 }

  const tabs = [
    { id: 'sentences', label: t.sentTranslation, icon: Languages, count: safeSentenceTranslations.length },
    { id: 'vocab', label: t.vocabList, icon: BookOpen, count: vocab.length },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      {processingInfo && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-stone-600">{t.processing}: 句子 {safeProcessingInfo.current} / {safeProcessingInfo.total}</span>
            <span className="text-sm text-stone-600">{progress}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2.5">
            <div
              className="bg-stone-800 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {!processingInfo && vocab.length > 0 && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onStartLearning}
          disabled={loading}
          className="w-full py-4 bg-stone-800 text-white font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t.preparing}
            </>
          ) : (
            <>
              <Shuffle className="w-5 h-5" />
              开始学习
            </>
          )}
        </motion.button>
      )}

      <div className="bg-white border border-stone-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-stone-200/80">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-stone-800'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-stone-100 text-stone-400'
                }`}>
                  {tab.count}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-amber-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'sentences' && (
            <motion.div
              key="sentences"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              {safeSentenceTranslations.length > 0 ? (
                <div className="divide-y divide-stone-200/60">
                  {safeSentenceTranslations.map((item, index) => (
                    <div key={index}>
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="p-4 hover:bg-amber-50/40 cursor-pointer transition-colors"
                        onClick={() => onSentenceClick(index)}
                      >
                        <div className="font-medium text-stone-800 mb-1.5">{item.sentence}</div>
                        {item.translation_result && item.translation_result.tokenized_translation && (
                          <div className="text-stone-600 text-sm">{item.translation_result.tokenized_translation}</div>
                        )}
                      </motion.div>
                      {selectedSentence === index && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-stone-200/60 p-4 bg-stone-50/50"
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
              ) : (
                <div className="py-16 text-center">
                  <Languages className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                  <p className="text-stone-400 text-sm">{t.loading}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'vocab' && (
            <motion.div
              key="vocab"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50/60 border-b border-stone-200/60">
                <div className="grid grid-cols-3 gap-1 flex-1">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{t.wordLabel}</div>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{t.meaningLabel}</div>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{t.posLabel}</div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onToggleSort}
                  className="ml-3 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-amber-50 rounded-md transition-colors text-xs font-medium"
                >
                  {sortOrder === 'asc' ? t.aToZ : t.zToA}
                </motion.button>
              </div>
              <div className="divide-y divide-stone-200/60">
                {vocab.map((word, index) => (
                  <div key={word.word || index}>
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="grid grid-cols-3 gap-1 p-4 hover:bg-amber-50/40 cursor-pointer transition-colors"
                      onClick={() => onWordClick(word.word)}
                    >
                      <div className="font-medium text-stone-800">{word.word}</div>
                      <div className="text-stone-600">{word.context_meaning}</div>
                      <div className="text-stone-500 font-mono text-sm">{word.morphology}</div>
                    </motion.div>
                    {selectedWord && selectedWord.word === word.word && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-stone-200/60 p-4 bg-stone-50/50"
                      >
                        <WordDetail
                          word={selectedWord}
                          t={t}
                        />
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default DictionaryStep
