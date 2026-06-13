
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

function PhaseProgressStep({ units, currentUnit, phaseNumber, onUnitClick, onBack, loading, t }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
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
          className="text-3xl font-semibold font-display text-theme-text mb-4"
        >
          {phaseNumber === 1 ? t.phase1 : t.phase2}
        </motion.h2>
        <p className="text-lg text-theme-text-secondary">
          {t.selectTokens}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-theme-text-secondary">{t.loading}</p>
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
                onClick={() => onUnitClick(unit.unit_id)}
                disabled={!unit.completed && index !== currentUnit}
                className={`w-full p-6 rounded-3xl transition-all duration-300 ${unit.completed ? 'bg-white border border-mint-500/30 shadow-card hover:shadow-card-hover hover:-translate-y-1' : index === currentUnit ? 'bg-white border border-soft-500/40 shadow-card hover:shadow-card-hover hover:-translate-y-1' : 'bg-theme-bg border border-theme-border/50 cursor-not-allowed opacity-50'}`}
              >
                <h3 className="text-xl font-semibold font-display text-theme-text mb-2">
                  {t.unit} {unit.unit_id + 1}
                </h3>
                <p className="text-theme-text-secondary">{unit.sentences_count} sentences</p>
                <div className="mt-4 text-sm font-medium">
                  {unit.completed ? (
                    <span className="text-theme-secondary">{t.completed}</span>
                  ) : index === currentUnit ? (
                    <span className="text-theme-primary">{t.startLearning}</span>
                  ) : (
                    <span className="text-theme-text-muted">{t.notStarted}</span>
                  )}
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default PhaseProgressStep;
