
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen } from 'lucide-react';

function VocabListStep({ vocab, onBack, loading, t }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto"
    >
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </motion.button>

      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-semibold text-slate-900 mb-2"
        >
          单词表
        </motion.h2>
        <p className="text-lg text-slate-600">{vocab.length} 个单词</p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-slate-600">{t.loading}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="space-y-4">
            {vocab.map((word, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border-b border-slate-100 last:border-b-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-slate-900">{word.word}</h3>
                  {word.ipa && (
                    <span className="text-sm text-slate-500">/{word.ipa}/</span>
                  )}
                </div>
                <p className="text-slate-600">
                  {word.enriched_meaning || word.context_meaning || word.translation}
                </p>
                {word.morphology && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                      {word.morphology}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default VocabListStep;
