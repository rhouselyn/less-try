import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { api } from '../utils/api';

export function MainPage({ onSelectLanguage }) {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      const data = await api.getLanguages();
      setLanguages(data.languages);
    } catch (error) {
      console.error('Error loading languages:', error);
    } finally {
      setLoading(false);
    }
  };

  const learnedLanguages = languages.filter(lang => lang.is_learned);
  const availableLanguages = languages.filter(lang => !lang.is_learned);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Lesslingo</h1>
              <p className="text-slate-500">探索语言的魅力</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 已学习的语言 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-2 h-8 bg-green-500 rounded-full"></span>
              已学习
            </h2>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-24 bg-white rounded-xl shadow-sm animate-pulse"
                  />
                ))}
              </div>
            ) : learnedLanguages.length > 0 ? (
              <div className="space-y-4">
                {learnedLanguages.map((lang, index) => (
                  <motion.button
                    key={lang.code}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => onSelectLanguage(lang.code)}
                    className="w-full text-left bg-white p-6 rounded-xl shadow-sm hover:shadow-md hover:translate-x-1 transition-all border border-slate-200 hover:border-blue-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {lang.name}
                        </h3>
                        <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                          {lang.description}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        →
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
                <p className="text-slate-500">还没有学习任何语言</p>
                <p className="text-sm text-slate-400 mt-1">从右侧选择一门语言开始吧！</p>
              </div>
            )}
          </section>

          {/* 待学习的语言 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
              探索语言
            </h2>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-24 bg-white rounded-xl shadow-sm animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {availableLanguages.map((lang, index) => (
                  <motion.button
                    key={lang.code}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectLanguage(lang.code)}
                    className="w-full text-left bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 group-hover:text-purple-600 transition-colors">
                          {lang.name}
                        </h3>
                        <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                          {lang.description}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                        +
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
