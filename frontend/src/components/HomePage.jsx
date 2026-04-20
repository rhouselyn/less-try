import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Globe, Loader2, Plus } from 'lucide-react'
import { api } from '../utils/api'

function HomePage({ t, onSelectLanguage, onNewParagraph, nativeLang }) {
  const [studiedLanguages, setStudiedLanguages] = useState([])
  const [languageIntros, setLanguageIntros] = useState({})
  const [loading, setLoading] = useState(true)
  const [currentAvailableIndex, setCurrentAvailableIndex] = useState(0)

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
  }, [])

  useEffect(() => {
    // 自动轮播可用语言
    const interval = setInterval(() => {
      setCurrentAvailableIndex(prev => (prev + 1) % availableLanguages.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await api.getStudiedLanguages()
      setStudiedLanguages(response.languages || [])

      const intros = {}
      for (const lang of response.languages || []) {
        try {
          const intro = await api.getLanguageIntro(lang)
          intros[lang] = intro
        } catch (e) {
          console.error(`Failed to load intro for ${lang}`, e)
        }
      }
      setLanguageIntros(intros)
    } catch (e) {
      console.error('Failed to load studied languages', e)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-semibold text-slate-900 mb-4">
            {t.title}
          </h1>
          <p className="text-xl text-slate-600">
            {t.subtitle || 'Lesslingo'}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">
              {t.studiedLanguages}
            </h2>
          </div>

          {studiedLanguages.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-600 mb-4">{t.noLanguages}</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNewParagraph}
                className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                {t.startFirstArticle}
              </motion.button>
            </div>
          ) : (
            <div className="space-y-4">
              {studiedLanguages.map((lang, index) => (
                <motion.div
                  key={lang}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  onClick={() => onSelectLanguage(lang)}
                  className="bg-white border border-slate-200 rounded-xl p-6 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{getLanguageIcon(lang)}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {languageIntros[lang]?.name || getLanguageName(lang)}
                      </h3>
                      {languageIntros[lang]?.description && (
                        <p className="text-slate-600 mt-1 line-clamp-2">
                          {languageIntros[lang].description}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">
              {t.availableLanguages}
            </h2>
          </div>

          <div className="relative h-80">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAvailableIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8"
              >
                <div className="text-center">
                  <div className="text-8xl mb-6">
                    {availableLanguages[currentAvailableIndex].icon}
                  </div>
                  <h3 className="text-3xl font-semibold text-slate-900 mb-2">
                    {availableLanguages[currentAvailableIndex].name}
                  </h3>
                  <p className="text-slate-600">
                    {t.exploreMore}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-center gap-2 mt-4">
              {availableLanguages.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${index === currentAvailableIndex ? 'bg-black w-6' : 'bg-slate-300'}`}
                />
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewParagraph}
            className="w-full mt-6 px-6 py-4 bg-black text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t.newParagraph}
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

export default HomePage
