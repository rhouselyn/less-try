
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';

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
  const isPhase1Unlocked = (index) => {
    if (index === 0) return true;
    for (let i = 0; i < index; i++) {
      if (!phase1Units[i]?.completed) return false;
    }
    return true;
  };

  const isPhase2Unlocked = (index) => {
    if (index === 0) return true;
    for (let i = 0; i < index; i++) {
      if (!phase2Units[i]?.completed) return false;
    }
    return true;
  };

  const renderUnitCard = (unit, index, isCurrent, onClick, keyPrefix, isUnlocked) => {
    const isCompleted = unit.completed;
    const isLocked = !isUnlocked && !isCompleted;
    
    return (
      <motion.button
        key={`${keyPrefix}-unit-${index}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.03 }}
        onClick={isLocked ? undefined : onClick}
        disabled={isLocked}
        className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-sm font-medium ${
          isCompleted
            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50'
            : isLocked
            ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200/50'
        }`}
      >
        {isLocked ? <Lock className="w-3.5 h-3.5" /> : index + 1}
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
        <p className="text-base text-stone-400">按顺序完成单元，解锁下一单元</p>
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
            <div className="flex flex-wrap gap-2">
              {phase1Units.map((unit, index) => 
                renderUnitCard(
                  unit, 
                  index, 
                  index === currentPhase1Unit, 
                  () => onPhase1UnitClick(index),
                  'phase1',
                  isPhase1Unlocked(index)
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-stone-700 mb-3 flex items-center gap-2">
              {t.phase2}
            </h3>
            <div className="flex flex-wrap gap-2">
              {phase2Units.map((unit, index) => 
                renderUnitCard(
                  unit, 
                  index, 
                  index === currentPhase2Unit, 
                  () => onPhase2UnitClick(index),
                  'phase2',
                  isPhase2Unlocked(index)
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
