
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';

function AllUnitsStep({ 
  phase1Units, 
  phase2Units, 
  currentPhase1Unit, 
  currentPhase2Unit, 
  onPhase1UnitClick, 
  onPhase2UnitClick, 
  onBack, 
  loading, 
  t 
}) {
  const renderUnitCard = (unit, index, isCurrent, onClick, keyPrefix) => {
    const isCompleted = unit.completed;
    
    return (
      <motion.button
        key={`${keyPrefix}-unit-${index}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.03 }}
        onClick={onClick}
        className={`relative p-4 border rounded-2xl transition-all text-center aspect-square flex flex-col items-center justify-center ${
          isCompleted
            ? 'border-emerald-400 bg-emerald-50/50'
            : isCurrent
            ? 'border-stone-300 bg-stone-50 shadow-sm'
            : 'border-stone-200/60 bg-white hover:border-stone-300 hover:shadow-sm'
        }`}
      >
        <span className="text-lg font-semibold text-stone-800 mb-1">
          {index + 1}
        </span>
        <p className="text-xs text-stone-400">
          {unit.no_eligible_sentences ? '无需练习' : `${unit.exercises_count || unit.word_count || unit.sentences_count || 0} 题`}
        </p>
        {isCompleted && (
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center mt-2">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
        {isCurrent && !isCompleted && (
          <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md mt-2">
            当前
          </span>
        )}
      </motion.button>
    );
  };

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
        className="flex items-center gap-2 px-4 py-2 text-stone-400 hover:text-stone-800 transition-colors rounded-lg hover:bg-stone-100 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </motion.button>

      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-semibold text-stone-800 mb-2"
        >
          学习单元
        </motion.h2>
        <p className="text-base text-stone-400">选择单元开始学习</p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-lg text-stone-400">{t.loading}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="text-base font-semibold text-stone-700 mb-3 flex items-center gap-2">
              {t.phase1}
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {phase1Units.map((unit, index) => 
                renderUnitCard(
                  unit, 
                  index, 
                  index === currentPhase1Unit, 
                  () => onPhase1UnitClick(index),
                  'phase1'
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-stone-700 mb-3 flex items-center gap-2">
              {t.phase2}
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {phase2Units.map((unit, index) => 
                renderUnitCard(
                  unit, 
                  index, 
                  index === currentPhase2Unit, 
                  () => onPhase2UnitClick(index),
                  'phase2'
                )
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default AllUnitsStep;
