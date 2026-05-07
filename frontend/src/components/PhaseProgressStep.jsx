
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
          {phaseNumber === 1 ? t.phase1 : t.phase2}
        </motion.h2>
        <p className="text-lg text-slate-600">
          {t.selectTokens}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-slate-600">{t.loading}</p>
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
                className={`w-full p-6 border rounded-2xl transition-all ${!unit.completed && index !== currentUnit ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50' : 'border-slate-200 bg-white hover:border-black hover:shadow-sm'}`}
              >
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {t.unit} {unit.unit_id + 1}
                </h3>
                <p className="text-slate-600">{unit.sentences_count} sentences</p>
                <div className="mt-4 text-sm font-medium">
                  {unit.completed ? (
                    <span className="text-green-600">{t.completed}</span>
                  ) : index === currentUnit ? (
                    <span className="text-blue-600">{t.startLearning}</span>
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

export default PhaseProgressStep;
