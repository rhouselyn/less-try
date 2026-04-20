
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
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </motion.button>

      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-semibold text-slate-900 mb-4"
        >
          {t.selectPhase}
        </motion.h2>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-slate-600">{t.loading}</p>
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
                className="w-full p-6 border border-slate-200 bg-white hover:border-black hover:shadow-sm rounded-2xl transition-all"
              >
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {phase.phase_number === 1 ? t.phase1 : t.phase2}
                </h3>
                <p className="text-slate-600 mb-2">{phase.units_count} {t.unit}s</p>
                <div className="text-sm font-medium">
                  {phase.progress.current_unit > 0 ? (
                    <span className="text-blue-600">
                      已完成 {phase.progress.current_unit}/{phase.units_count} {t.unit}s
                    </span>
                  ) : (
                    <span className="text-slate-400">{t.notStarted}</span>
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
