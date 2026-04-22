
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

function AllUnitsStep({ 
  phase1Units, 
  phase2Units, 
  currentPhase1Unit, 
  currentPhase2Unit, 
  onPhase1UnitClick, 
  onPhase2UnitClick, 
  onBack, 
  onOpenVocabList, 
  loading, 
  t 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto"
    >
      <div className="flex justify-between items-center mb-8">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back}
        </motion.button>
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onOpenVocabList}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100"
        >
          {t.vocabularyList}
        </motion.button>
      </div>

      <div className="text-center mb-10">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-semibold text-slate-900 mb-2"
        >
          学习单元
        </motion.h2>
        <p className="text-lg text-slate-600">选择单元开始学习</p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-slate-600">{t.loading}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 阶段一：单词学习 */}
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">1</span>
              {t.phase1}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {phase1Units.map((unit, index) => (
                <motion.button
                  key={`phase1-unit-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onPhase1UnitClick(index)}
                  className={`p-5 border rounded-2xl transition-all text-left ${
                    index === currentPhase1Unit
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : unit.completed
                      ? 'border-green-300 bg-green-50 hover:border-green-500 hover:shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold text-slate-900">
                      单元 {index + 1}
                    </span>
                    {unit.completed && (
                      <span className="text-green-600 text-xl">✓</span>
                    )}
                    {index === currentPhase1Unit && (
                      <span className="text-blue-600 text-sm font-medium">当前</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {unit.sentences_count} 个句子
                  </p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* 阶段二：句子练习 */}
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm">2</span>
              {t.phase2}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {phase2Units.map((unit, index) => (
                <motion.button
                  key={`phase2-unit-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: phase1Units.length * 0.05 + index * 0.05 }}
                  onClick={() => onPhase2UnitClick(index)}
                  className={`p-5 border rounded-2xl transition-all text-left ${
                    index === currentPhase2Unit
                      ? 'border-orange-500 bg-orange-50 shadow-md'
                      : unit.completed
                      ? 'border-green-300 bg-green-50 hover:border-green-500 hover:shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold text-slate-900">
                      单元 {index + 1}
                    </span>
                    {unit.completed && (
                      <span className="text-green-600 text-xl">✓</span>
                    )}
                    {index === currentPhase2Unit && (
                      <span className="text-orange-600 text-sm font-medium">当前</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {unit.sentences_count} 个句子
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default AllUnitsStep;
