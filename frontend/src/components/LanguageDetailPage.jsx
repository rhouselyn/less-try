import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Globe, CheckSquare, Square } from 'lucide-react'
import { api } from '../utils/api'

function LanguageDetailPage({ t, language, nativeLang, setNativeLang, onBack, onNewParagraph, onArticleClick }) {
  const [articles, setArticles] = useState([])
  const [languageIntro, setLanguageIntro] = useState(null)
  const [loading, setLoading] = useState(true)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedArticles, setSelectedArticles] = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const availableLanguages = [
    { code: 'en', name: 'English', icon: '🇬🇧' },
    { code: 'zh', name: '中文', icon: '🇨🇳' },
    { code: 'es', name: 'Español', icon: '🇪🇸' },
    { code: 'fr', name: 'Français', icon: '🇫🇷' },
    { code: 'de', name: 'Deutsch', icon: '🇩🇪' },
    { code: 'ja', name: '日本語', icon: '🇯🇵' }
  ]

  useEffect(() => {
    loadData()
  }, [language])

  const loadData = async () => {
    try {
      setLoading(true)
      const articlesResponse = await api.getArticlesByLanguage(language)
      setArticles(articlesResponse.articles || [])

      try {
        const intro = await api.getLanguageIntro(language)
        setLanguageIntro(intro)
      } catch (e) {
        console.error('Failed to load language intro', e)
      }
    } catch (e) {
      console.error('Failed to load articles', e)
    } finally {
      setLoading(false)
    }
  }

  const getLanguageName = (code) => {
    const lang = availableLanguages.find(l => l.code === code)
    return lang ? lang.name : code
  }

  const getLanguageIcon = (code) => {
    const lang = availableLanguages.find(l => l.code === code)
    return lang ? lang.icon : '🌍'
  }

  const toggleArticleSelection = (fileId) => {
    setSelectedArticles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId)
      } else {
        return [...prev, fileId]
      }
    })
  }

  const handleDeleteArticles = async () => {
    try {
      for (const fileId of selectedArticles) {
        await api.deleteArticle(fileId)
      }
      setSelectedArticles([])
      setBatchMode(false)
      setDeleteConfirm(null)
      loadData()
    } catch (e) {
      console.error('Failed to delete articles', e)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          {t.back}
        </motion.button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-slate-500" />
            <select
              value={nativeLang}
              onChange={(e) => setNativeLang(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-black"
            >
              {availableLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.icon} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {articles.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setBatchMode(!batchMode)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                batchMode 
                  ? 'bg-black text-white' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {batchMode ? t.cancel : t.batchManage}
            </motion.button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">{t.articles}</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNewParagraph}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t.newParagraph}
            </motion.button>
          </div>

          {articles.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-8 text-center">
              <p className="text-slate-600 mb-4">{t.noArticles}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onNewParagraph}
                className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                {t.newParagraph}
              </motion.button>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className={`bg-white border border-slate-200 rounded-xl p-4 transition-all ${
                    batchMode ? 'cursor-default' : 'cursor-pointer hover:border-slate-300 hover:shadow-md'
                  }`}
                  onClick={() => {
                    if (!batchMode) onArticleClick(article)
                  }}
                >
                  <div className="flex items-center gap-4">
                    {batchMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleArticleSelection(article.id)
                        }}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        {selectedArticles.includes(article.id) ? (
                          <CheckSquare className="w-6 h-6 text-black" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-400" />
                        )}
                      </button>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-slate-900 line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {new Date(article.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {batchMode && selectedArticles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-6"
            >
              <p className="text-red-900 mb-4">
                {t.deleteConfirm}
              </p>
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedArticles([])}
                  className="px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {t.cancel}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteArticles}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  {t.delete} ({selectedArticles.length})
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl">{getLanguageIcon(language)}</div>
              <h2 className="text-3xl font-semibold text-slate-900">
                {languageIntro?.name || getLanguageName(language)}
              </h2>
            </div>

            {languageIntro?.description && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-slate-900 mb-2">{t.languageIntro}</h3>
                <p className="text-slate-700">{languageIntro.description}</p>
              </div>
            )}

            {languageIntro?.quotes && languageIntro.quotes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-slate-900 mb-2">{t.quotes}</h3>
                <div className="space-y-3">
                  {languageIntro.quotes.map((quote, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="bg-white border border-slate-200 rounded-lg p-4 italic text-slate-700"
                    >
                      "{quote}"
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {languageIntro?.history && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-slate-900 mb-2">{t.history}</h3>
                <p className="text-slate-700">{languageIntro.history}</p>
              </div>
            )}

            {languageIntro?.relationships && languageIntro.relationships.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">{t.relatedLanguages}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {languageIntro.relationships.map((rel, index) => (
                    <div
                      key={index}
                      className="bg-white border border-slate-200 rounded-lg p-4"
                    >
                      <h4 className="font-medium text-slate-900">{rel.language}</h4>
                      <p className="text-sm text-slate-600 mt-1">{rel.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default LanguageDetailPage
