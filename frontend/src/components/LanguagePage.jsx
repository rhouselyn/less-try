import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, BookOpen, Quote, History, Link2 } from 'lucide-react';
import { api } from '../utils/api';

export function LanguagePage({ langCode, onBack, onAddArticle, onSelectArticle }) {
  const [language, setLanguage] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (langCode) {
      loadData();
    }
  }, [langCode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [langData, articlesData] = await Promise.all([
        api.getLanguage(langCode),
        api.getArticles(langCode)
      ]);
      setLanguage(langData);
      setArticles(articlesData.articles);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = async (articleId) => {
    if (!window.confirm('确定要删除这篇文章吗？')) return;
    
    try {
      setDeletingId(articleId);
      await api.deleteArticle(langCode, articleId);
      await loadData();
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-10 bg-white rounded-lg shadow-sm animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white rounded-xl shadow-sm animate-pulse" />
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white rounded-xl shadow-sm animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </motion.button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{language?.name}</h1>
                <p className="text-slate-500">{language?.description}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAddArticle}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Plus className="w-5 h-5" />
              添加文章
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 文章列表 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              学习文章
            </h2>
            {articles.length > 0 ? (
              <div className="space-y-3">
                {articles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        onClick={() => onSelectArticle(article)}
                        className="flex-1 text-left"
                      >
                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {new Date(article.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </button>
                      {deletingId === article.id ? (
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteArticle(article.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">还没有文章</p>
                <p className="text-sm text-slate-400 mt-1">点击右上角添加第一篇文章开始学习！</p>
              </div>
            )}
          </section>

          {/* 语言介绍 */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">语言简介</h2>
            
            {/* 名言 */}
            {language?.famous_quotes?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-100"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Quote className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">名言佳句</h3>
                </div>
                <div className="space-y-4">
                  {language.famous_quotes.map((quote, index) => (
                    <div key={index} className="italic text-yellow-800">
                      "{quote.quote}"
                      <span className="block text-sm text-yellow-700 not-italic mt-1">
                        — {quote.author}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 历史 */}
            {language?.history && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-slate-900">历史渊源</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">{language.history}</p>
              </motion.div>
            )}

            {/* 与其他语言的关系 */}
            {language?.relations && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-slate-900">语言联系</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">{language.relations}</p>
              </motion.div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
