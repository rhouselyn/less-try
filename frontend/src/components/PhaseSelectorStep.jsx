
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

function PhaseSelectorStep({ phases, currentFileId, onPhaseSelect, onBack, loading, t }) {
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
          className="text-3xl font-black uppercase font-display text-[var(--color-dark)] mb-4"
        >
          {t.selectPhase}
        </motion.h2>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-[var(--color-dark)]">{t.loading}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {phases.map((phase, index) => (
            <motion.div
              key={phase.phase_number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => onPhaseSelect(phase.phase_number)}
                className="w-full p-6 border-[var(--border-width)] border-[var(--border-color)] bg-[var(--color-card)] hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] transition-all"
              >
                <h3 className="text-xl font-black uppercase font-display text-[var(--color-dark)] mb-2">
                  {phase.phase_number === 1 ? t.phase1 : t.phase2}
                </h3>
                <p className="text-[var(--color-dark)] mb-2">{phase.units_count} {t.unit}s</p>
                <div className="text-sm font-medium">
                  {phase.progress.current_unit > 0 ? (
                    <span className="text-[var(--color-accent)]">
                      已完成 {phase.progress.current_unit}/{phase.units_count} {t.unit}s
                    </span>
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
  );
}

export default PhaseSelectorStep;
