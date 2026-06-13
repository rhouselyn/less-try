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
          className="text-3xl font-black uppercase font-display text-[var(--color-dark)] mb-4"
        >
          {t.progress}
        </motion.h2>
        <p className="text-lg text-[var(--color-dark)]">
          {t.selectTokens}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[var(--color-muted)]" />
          <p className="text-lg text-[var(--color-dark)]">{t.loading}</p>
        </div>
      ) : allUnitsCompleted ? (
        <div className="text-center py-16">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-black uppercase font-display text-[var(--color-dark)] mb-4"
          >
            🎉 {t.completed}
          </motion.h2>
          <p className="text-lg text-[var(--color-dark)] mb-8">{t.allUnitsComplete || '所有单元学习完成！'}</p>
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
                className={`w-full p-6 border-[var(--border-width)] border-[var(--border-color)] rounded-[var(--radius-md)] transition-all ${unit.completed ? 'bg-[#e6f5f3] border-[var(--color-success)]' : index === currentUnit ? 'bg-[var(--color-highlight)] border-[var(--color-accent)] hover:shadow-[var(--shadow-sm)]' : 'bg-[var(--color-bg)] cursor-not-allowed opacity-50'}`}
              >
                <h3 className="text-xl font-black uppercase font-display text-[var(--color-dark)] mb-2">{t.unit} {index + 1}</h3>
                <p className="text-[var(--color-dark)]">{unit.word_count} {t.wordLabel}</p>
                <div className="mt-4 text-sm font-medium">
                  {unit.completed ? (
                    <span className="text-[var(--color-success)]">{t.completed}</span>
                  ) : index === currentUnit ? (
                    <span className="text-[var(--color-accent)]">{t.startLearning}</span>
                  ) : (
                    <span className="text-[var(--color-muted)]">{t.notStarted}</span>
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
