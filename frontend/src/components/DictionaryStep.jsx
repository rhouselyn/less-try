import { motion } from 'framer-motion'
import { Shuffle, Loader2 } from 'lucide-react'
import WordDetail from './WordDetail'
import SentenceDetail from './SentenceDetail'

function DictionaryStep({ vocab, onToggleSort, sortOrder, progress, processingInfo, sentenceTranslations, selectedSentence, selectedWord, onSentenceClick, onCloseSentenceDetail, onWordClick, onStartLearning, loading, t }) {
  // 安全检查，确保sentenceTranslations是数组
  const safeSentenceTranslations = Array.isArray(sentenceTranslations) ? sentenceTranslations : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >


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
              开始学习
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

export default DictionaryStep