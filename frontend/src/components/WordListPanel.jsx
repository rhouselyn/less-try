import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ChevronDown, ChevronUp, Volume2, Brain, BookOpen, Lightbulb, GitBranch, Tag, Loader2 } from 'lucide-react'
import { api } from '../utils/api'
import { speakText } from '../utils/speech'

function WordDetailCard({ word, sourceLang, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="px-5 pb-5 pt-2 space-y-4 border-t border-stone-100">
        {word.meaning && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Brain className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">释义</span>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed pl-5">{word.meaning}</p>
          </div>
        )}

        {word.context_sentences && word.context_sentences.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">例句</span>
            </div>
            <div className="pl-5 space-y-2">
              {word.context_sentences.slice(0, 3).map((cs, i) => (
                <div key={i} className="text-sm">
                  <div className="flex items-start gap-1.5">
                    <p className="text-stone-700 flex-1">{cs.sentence || cs}</p>
                    {cs.sentence && (
                      <button
                        onClick={(e) => { e.stopPropagation(); speakText(cs.sentence, sourceLang) }}
                        className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors shrink-0"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {cs.translation && (
                    <p className="text-stone-500 text-xs mt-0.5">{cs.translation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {word.ipa && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">音标</span>
            </div>
            <p className="text-sm text-stone-700 pl-5 ipa-font">
              {word.ipa.startsWith('/') ? word.ipa : `/${word.ipa}/`}
            </p>
          </div>
        )}

        {word.part_of_speech && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">词性</span>
            </div>
            <p className="text-sm text-stone-700 pl-5">{word.part_of_speech}</p>
          </div>
        )}

        {word.memory_hint && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">记忆辅助</span>
            </div>
            <p className="text-sm text-stone-700 pl-5 bg-amber-50/60 p-3 rounded-lg border border-amber-100/60">
              {word.memory_hint}
            </p>
          </div>
        )}

        {word.variants_detail && word.variants_detail.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <GitBranch className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">变体</span>
            </div>
            <div className="pl-5 flex flex-wrap gap-2">
              {word.variants_detail.map((v, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 text-stone-700 rounded-md text-xs">
                  <span className="text-stone-400 font-medium">{v.type}</span>
                  <span>{v.form}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function WordListPanel({ sourceLang, targetLang, t }) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedWord, setExpandedWord] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  const loadWords = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getWordList(sourceLang, targetLang)
      setWords(data.words || [])
    } catch (err) {
      console.error('Failed to load word list:', err)
    } finally {
      setLoading(false)
    }
  }, [sourceLang, targetLang])

  useEffect(() => {
    if (isOpen) {
      loadWords()
    }
  }, [isOpen, loadWords])

  const filteredWords = searchQuery.trim()
    ? words.filter(w =>
        w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.meaning && w.meaning.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : words

  const handleWordClick = (wordText) => {
    setExpandedWord(prev => prev === wordText ? null : wordText)
  }

  return (
    <div className="mt-6">
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200/60 hover:border-amber-200/60 transition-all shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-stone-700">单词总表</span>
          {!isOpen && words.length > 0 && (
            <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{words.length} 词</span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-stone-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200/60 shadow-sm">
              <div className="p-4 border-b border-stone-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索单词或释义..."
                    className="w-full pl-9 pr-9 py-2.5 text-sm bg-stone-50 border border-stone-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder-stone-400 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-xs text-stone-400">
                    {loading ? '加载中...' : `共 ${filteredWords.length} 个单词`}
                  </span>
                  {!loading && words.length > 0 && (
                    <span className="text-xs text-stone-300">
                      {sourceLang} → {targetLang}
                    </span>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="ml-2 text-sm text-stone-400">加载单词表...</span>
                </div>
              ) : filteredWords.length === 0 ? (
                <div className="py-12 text-center">
                  <BookOpen className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                  <p className="text-sm text-stone-400">
                    {searchQuery ? '未找到匹配的单词' : '暂无单词，开始学习后将自动收录'}
                  </p>
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto">
                  {filteredWords.map((word, index) => (
                    <motion.div
                      key={word.word}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.5) }}
                      className="border-b border-stone-50 last:border-b-0"
                    >
                      <button
                        onClick={() => handleWordClick(word.word)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-stone-50/80 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-stone-800">{word.word}</span>
                            {word.ipa && (
                              <span className="text-xs text-stone-400 ipa-font">
                                {word.ipa.startsWith('/') ? word.ipa : `/${word.ipa}/`}
                              </span>
                            )}
                            {word.part_of_speech && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded font-medium">
                                {word.part_of_speech}
                              </span>
                            )}
                          </div>
                          {word.meaning && (
                            <p className="text-xs text-stone-500 mt-0.5 truncate">{word.meaning}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); speakText(word.word, sourceLang) }}
                            className="p-1.5 text-stone-300 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <motion.div
                            animate={{ rotate: expandedWord === word.word ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-stone-300" />
                          </motion.div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedWord === word.word && (
                          <WordDetailCard
                            word={word}
                            sourceLang={sourceLang}
                            onClose={() => setExpandedWord(null)}
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default WordListPanel
