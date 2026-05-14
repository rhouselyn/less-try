import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shuffle, Loader2, Languages, BookOpen } from 'lucide-react'
import WordDetail from './WordDetail'
import SentenceDetail from './SentenceDetail'

function DictionaryStep({ vocab, onToggleSort, sortOrder, progress, processingInfo, sentenceTranslations, selectedSentence, selectedWord, onSentenceClick, onCloseSentenceDetail, onWordClick, onStartLearning, loading, t }) {
  const [activeTab, setActiveTab] = useState('sentences')

  const safeSentenceTranslations = Array.isArray(sentenceTranslations) ? sentenceTranslations : []
  const safeProcessingInfo = processingInfo || { current: 0, total: 1 }

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
          <button
            onClick={() => setActiveTab('sentences')}
            className={`relative flex-1 flex items-center justify-center gap-2.5 py-4 text-sm font-medium transition-all duration-200 ${
              activeTab === 'sentences'
                ? 'text-stone-800'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>{t.sentTranslation}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full transition-colors duration-200 ${
              activeTab === 'sentences'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-stone-100 text-stone-400'
            }`}>
              {safeSentenceTranslations.length}
            </span>
            {activeTab === 'sentences' && (
              <motion.div
                layoutId="dict-tab-indicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-amber-500 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('vocab')}
            className={`relative flex-1 flex items-center justify-center gap-2.5 py-4 text-sm font-medium transition-all duration-200 ${
              activeTab === 'vocab'
                ? 'text-stone-800'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{t.vocabList}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full transition-colors duration-200 ${
              activeTab === 'vocab'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-stone-100 text-stone-400'
            }`}>
              {vocab.length}
            </span>
            {activeTab === 'vocab' && (
              <motion.div
                layoutId="dict-tab-indicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-amber-500 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>

        <div className="relative">
          {activeTab === 'sentences' && (
            <div key="sentences-panel">
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
            </div>
          )}

          {activeTab === 'vocab' && (
            <div key="vocab-panel">
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
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default DictionaryStep
