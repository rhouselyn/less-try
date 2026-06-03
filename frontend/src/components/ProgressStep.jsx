import { motion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'

function ProgressStep({ units, currentUnit, onUnitClick, onBack, loading, t, allUnitsCompleted }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      {/* 返回按钮 */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="btn-ghost flex items-center gap-2 px-4 py-2 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </motion.button>

      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-semibold font-display text-ink-700 mb-4"
        >
          {t.progress}
        </motion.h2>
        <p className="text-lg text-ink-600">
          {t.selectTokens}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-ink-400" />
          <p className="text-lg text-ink-600">{t.loading}</p>
        </div>
      ) : allUnitsCompleted ? (
        <div className="text-center py-16">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-semibold font-display text-ink-700 mb-4"
          >
            🎉 {t.completed}
          </motion.h2>
          <p className="text-lg text-ink-600 mb-8">{t.allUnitsComplete || '所有单元学习完成！'}</p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onBack}
            className="btn-primary px-6 py-3"
          >
            {t.backToVocab || '返回单词表'}
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {units.map((unit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => onUnitClick(index)}
                disabled={!unit.completed && index !== currentUnit}
                className={`w-full p-6 border rounded-3xl transition-all ${unit.completed ? 'bg-moss-50 border-moss-200' : index === currentUnit ? 'bg-ochre-50 border-ochre-300 hover:shadow-warm-sm' : 'bg-cream-100 border-bone-200 cursor-not-allowed opacity-50'}`}
              >
                <h3 className="text-xl font-semibold font-display text-ink-800 mb-2">{t.unit} {index + 1}</h3>
                <p className="text-ink-600">{unit.word_count} {t.wordLabel}</p>
                <div className="mt-4 text-sm font-medium">
                  {unit.completed ? (
                    <span className="text-moss-600">{t.completed}</span>
                  ) : index === currentUnit ? (
                    <span className="text-ochre-500">{t.startLearning}</span>
                  ) : (
                    <span className="text-ink-400">{t.notStarted}</span>
                  )}
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default ProgressStep
