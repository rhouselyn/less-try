import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ChevronDown, Volume2, Brain, BookOpen, BookText, Lightbulb, GitBranch, Tag, Loader2, ArrowLeft } from 'lucide-react'
import { api } from '../utils/api'
import { speakText } from '../utils/speech'

function WordDetailCard({ word, sourceLang }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="px-5 pb-5 pt-2 space-y-3 border-t border-stone-100">
        {word.meaning && (
          <div>
            <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Brain className="w-3 h-3" />
              释义
            </h3>
            <p className="text-[13px] text-stone-700 leading-relaxed pl-5">{word.meaning}</p>
          </div>
        )}

        {word.variants_detail && word.variants_detail.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" />
              变体
            </h3>
            <div className="pl-5 flex flex-wrap gap-x-3 gap-y-1">
              {word.variants_detail.map((variant, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[11px] font-medium">
                    {variant.type}
                  </span>
                  <span className="text-stone-600 text-[13px]">{variant.form}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {word.context_sentences && word.context_sentences.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <BookText className="w-3 h-3" />
              例句
            </h3>
            <div className="pl-5 space-y-1.5">
              {word.context_sentences.slice(0, 3).map((cs, i) => {
                const sentence = typeof cs === 'string' ? cs : cs.sentence
                const translation = typeof cs === 'object' ? cs.translation : null
                return (
                  <div key={i} className="border-l-[1.5px] border-stone-300 pl-2.5">
                    <div className="flex items-start gap-1.5">
                      <p className="text-stone-700 text-[13px] leading-snug flex-1">{sentence}</p>
                      {sentence && (
                        <button
                          onClick={(e) => { e.stopPropagation(); speakText(sentence, sourceLang) }}
                          className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors shrink-0"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {translation && (
                      <p className="text-stone-400 text-[11px] leading-snug mt-0.5">{translation}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {word.memory_hint && (
          <div>
            <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="w-3 h-3" />
              记忆辅助
            </h3>
            <p className="text-[13px] text-stone-600 leading-relaxed bg-amber-50/70 px-3 py-2 rounded-lg border border-amber-100">
              {word.memory_hint}
            </p>
          </div>
        )}

        {word.ipa && (
          <div>
            <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3 h-3" />
              音标
            </h3>
            <p className="text-[13px] text-stone-700 pl-5 ipa-font">
              {word.ipa.startsWith('/') ? word.ipa : `/${word.ipa}/`}
            </p>
          </div>
        )}

        {word.part_of_speech && (
          <div>
            <h3 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3 h-3" />
              词性
            </h3>
            <p className="text-[13px] text-stone-700 pl-5">{word.part_of_speech}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function WordListPanel({ sourceLang, targetLang, t, onBack }) {
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
    if (onBack) {
      loadWords()
    }
  }, [onBack, loadWords])

  useEffect(() => {
    if (isOpen && !onBack) {
      loadWords()
    }
  }, [isOpen, loadWords, onBack])

  const filteredWords = searchQuery.trim()
    ? words.filter(w =>
        w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.meaning && w.meaning.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : words

  const handleWordClick = (wordText) => {
    setExpandedWord(prev => prev === wordText ? null : wordText)
  }

  if (onBack) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200/60 bg-white/80 backdrop-blur-sm rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <span className="text-base font-semibold text-stone-800">单词总表</span>
            {!loading && words.length > 0 && (
              <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{words.length} 词</span>
            )}
            {!loading && words.length > 0 && (
              <span className="text-xs text-stone-300">
                {sourceLang} → {targetLang}
              </span>
            )}
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
        </div>

        <div className="p-4 border-b border-stone-100 bg-white/60">
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
          <div className="mt-2">
            <span className="text-xs text-stone-400">
              {loading ? '加载中...' : `共 ${filteredWords.length} 个单词`}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white/80 backdrop-blur-sm rounded-b-xl">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span className="ml-2 text-sm text-stone-400">加载单词表...</span>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="w-8 h-8 text-stone-200 mx-auto mb-2" />
              <p className="text-sm text-stone-400">
                {searchQuery ? '未找到匹配的单词' : '暂无单词，开始学习后将自动收录'}
              </p>
            </div>
          ) : (
            <div>
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
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
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
