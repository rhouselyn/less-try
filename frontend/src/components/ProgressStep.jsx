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
          className="text-3xl font-black uppercase font-display text-[#1a1a2e] mb-4"
        >
          {t.progress}
        </motion.h2>
        <p className="text-lg text-[#4a4a6a]">
          {t.selectTokens}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#7a7a9a]" />
          <p className="text-lg text-[#4a4a6a]">{t.loading}</p>
        </div>
      ) : allUnitsCompleted ? (
        <div className="text-center py-16">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-black uppercase font-display text-[#1a1a2e] mb-4"
          >
            🎉 {t.completed}
          </motion.h2>
          <p className="text-lg text-[#4a4a6a] mb-8">{t.allUnitsComplete || '所有单元学习完成！'}</p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
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
                className={`w-full p-6 border-[3px] transition-all duration-150 ${unit.completed ? 'bg-[#e6fff5] border-[#06d6a0]' : index === currentUnit ? 'bg-[#fff0f6] border-[#ff006e] hover:shadow-[1px_1px_0_#1a1a2e] hover:translate-x-[2px] hover:translate-y-[2px]' : 'bg-[#f0f0ff] border-[#1a1a2e] cursor-not-allowed opacity-60'}`}
              >
                <h3 className="text-xl font-black uppercase font-display text-[#1a1a2e] mb-2">{t.unit} {index + 1}</h3>
                <p className="text-[#4a4a6a]">{unit.word_count} {t.wordLabel}</p>
                <div className="mt-4 text-sm font-bold">
                  {unit.completed ? (
                    <span className="text-[#06d6a0]">{t.completed}</span>
                  ) : index === currentUnit ? (
                    <span className="text-[#ff006e]">{t.startLearning}</span>
                  ) : (
                    <span className="text-[#7a7a9a]">{t.notStarted}</span>
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
