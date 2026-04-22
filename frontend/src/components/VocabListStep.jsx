
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen } from 'lucide-react';

function VocabListStep({ vocab, onBack, t }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto"
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
          {t.vocabularyList}
        </motion.h2>
        <p className="text-lg text-slate-600">{vocab.length} {t.words}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-slate-600">
            <div>单词</div>
            <div>音标</div>
            <div>释义</div>
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {vocab.map((word, index) => (
            <motion.div
              key={word.word}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="p-4 hover:bg-slate-50"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="font-medium text-slate-900">{word.word}</div>
                <div className="text-slate-600 text-sm">{word.ipa || '-'}</div>
                <div className="text-slate-700">
                  {word.context_meaning || word.translation || word.meaning}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default VocabListStep;
