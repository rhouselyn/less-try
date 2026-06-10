
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
          className="text-3xl font-black uppercase font-display text-[#1a1a2e] mb-4"
        >
          {phaseNumber === 1 ? t.phase1 : t.phase2}
        </motion.h2>
        <p className="text-lg text-[#4a4a6a]">
          {t.selectTokens}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-[#4a4a6a]">{t.loading}</p>
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
                className={`w-full p-6 border-[3px] transition-all duration-150 ${unit.completed ? 'bg-[#06d6a0] text-white border-[#1a1a2e]' : index === currentUnit ? 'bg-[#ff006e] text-white border-[#1a1a2e] shadow-[3px_3px_0_#1a1a2e]' : 'bg-[#e0e0f0] text-[#7a7a9a] border-[#b0b0c8] cursor-not-allowed'}`}
              >
                <h3 className={`text-xl font-black uppercase font-display mb-2 ${unit.completed || index === currentUnit ? 'text-white' : 'text-[#1a1a2e]'}`}>
                  {t.unit} {unit.unit_id + 1}
                </h3>
                <p className={`${unit.completed || index === currentUnit ? 'text-white' : 'text-[#4a4a6a]'}`}>{unit.sentences_count} sentences</p>
                <div className="mt-4 text-sm font-bold">
                  {unit.completed ? (
                    <span className="text-white">{t.completed}</span>
                  ) : index === currentUnit ? (
                    <span className="text-white">{t.startLearning}</span>
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
  );
}

export default PhaseProgressStep;
