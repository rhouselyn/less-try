import { motion } from 'framer-motion'
import { Shuffle, Loader2 } from 'lucide-react'
import WordDetail from './WordDetail'
import SentenceDetail from './SentenceDetail'

function DictionaryStep({ vocab, onToggleSort, sortOrder, progress, processingInfo, sentenceTranslations, selectedSentence, selectedWord, onSentenceClick, onCloseSentenceDetail, onWordClick, onStartLearning, loading, t }) {
  // 安全检查，确保sentenceTranslations是数组
  const safeSentenceTranslations = Array.isArray(sentenceTranslations) ? sentenceTranslations : []

  // 确保processingInfo是对象
  const safeProcessingInfo = processingInfo || { current: 0, total: 1 }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      {/* 处理进度条 */}
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

      {/* 开始学习按钮 */}
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

      {/* 句子列表 */}
      {safeSentenceTranslations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-stone-800 mb-4">{t.sentTranslation}</h2>
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-stone-200">
              {safeSentenceTranslations.map((item, index) => (
                <div key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-4 hover:bg-amber-50/50 cursor-pointer"
                    onClick={() => onSentenceClick(index)}
                  >
                    <div className="font-medium text-stone-800 mb-2">{item.sentence}</div>
                    {item.translation_result && item.translation_result.tokenized_translation && (
                      <div className="text-stone-700">{item.translation_result.tokenized_translation}</div>
                    )}
                  </motion.div>
                  {selectedSentence === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-stone-200 p-4 bg-stone-50"
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
          <h2 className="text-xl font-semibold text-stone-800">
            {t.vocabList} ({vocab.length})
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleSort}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-amber-50 rounded-md transition-colors"
          >
            {sortOrder === 'asc' ? t.aToZ : t.zToA}
          </motion.button>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 gap-1 p-4 bg-amber-50 border-b border-stone-200">
            <div className="font-semibold text-stone-700">{t.wordLabel}</div>
            <div className="font-semibold text-stone-700">{t.meaningLabel}</div>
            <div className="font-semibold text-stone-700">{t.posLabel}</div>
          </div>
          <div className="divide-y divide-stone-200">
            {vocab.map((word, index) => (
              <div key={word.word || index}>
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="grid grid-cols-3 gap-1 p-4 hover:bg-amber-50/50 cursor-pointer"
                  onClick={() => onWordClick(word.word)}
                >
                  <div className="font-medium text-stone-800 hover:text-stone-800 transition-colors">{word.word}</div>
                  <div className="text-stone-700">{word.context_meaning}</div>
                  <div className="text-stone-600 font-mono">{word.morphology}</div>
                </motion.div>
                {selectedWord && selectedWord.word === word.word && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-stone-200 p-4 bg-stone-50"
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