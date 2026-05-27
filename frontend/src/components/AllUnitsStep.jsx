
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Star, Headphones, Loader2, MapPin } from 'lucide-react';

function AllUnitsStep({
  phase1Units,
  phase2Units,
  currentPhase1Unit,
  currentPhase2Unit,
  onPhase1UnitClick,
  onPhase2UnitClick,
  onBack,
  loading,
  t,
  unitStarCounts,
  skipListening,
  onSkipListeningChange,
  generatingUnits,
  fileTitle
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

  const renderUnitCard = (unit, index, isCurrent, onClick, keyPrefix, isUnlocked, phaseNumber) => {
    const isCompleted = unit.completed;
    const isGenerating = phaseNumber === 1 && index === 0 && generatingUnits?.has(index);
    const isLocked = !isUnlocked && !isCompleted && !isGenerating;
    const starKey = `${phaseNumber}-${index}`;
    const starCount = unitStarCounts?.[starKey];

    return (
      <motion.button
        key={`${keyPrefix}-unit-${index}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.03 }}
        onClick={isLocked || isGenerating ? undefined : onClick}
        disabled={isLocked || isGenerating}
        className={`relative flex flex-col items-center justify-center rounded-lg transition-all ${
          isCompleted
            ? 'bg-[#e8f5e0] text-[#3d7a2a] border border-[#c3e0b2]/60'
            : isGenerating
            ? 'bg-amber-50 text-amber-400 border border-amber-200/60 cursor-not-allowed'
            : isLocked
            ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
            : 'bg-[#fef9ec] text-[#b8941e] hover:bg-[#fdf3d8] border border-[#f0e2b6]/60'
        }`}
        style={{ width: '2.5rem', height: '2.5rem' }}
      >
        {isGenerating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isLocked ? (
          <Lock className="w-3.5 h-3.5" />
        ) : isCompleted ? (
          <span className="text-xs font-bold text-green-700">{index + 1}</span>
        ) : (
          <MapPin className="w-3.5 h-3.5 text-amber-500" />
        )}
        {isCompleted && typeof starCount === 'number' && (
          <div className="flex items-center justify-center gap-px mt-0.5">
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                className={`w-2 h-2 ${
                  i < starCount
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-stone-300 fill-stone-300'
                }`}
              />
            ))}
          </div>
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

      <div className="text-center mb-8 relative">
        {fileTitle && (
          <p className="text-sm font-medium text-stone-500 mb-1 truncate max-w-[400px] mx-auto">{fileTitle}</p>
        )}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-semibold text-stone-800 mb-2"
        >
          {t.learningUnits || '学习单元'}
        </motion.h2>
        <p className="text-base text-stone-400">{t.completeUnitsInOrder || '按顺序完成单元，解锁下一单元'}</p>
        
        <label className="absolute right-0 top-1 flex items-center gap-2 cursor-pointer select-none group">
          <span className="text-xs text-stone-400 group-hover:text-stone-600 transition-colors flex items-center gap-1">
            <Headphones className="w-3.5 h-3.5" />
            {t.skipListening || '跳过听力'}
          </span>
          <div className="relative">
            <input
              type="checkbox"
              checked={skipListening || false}
              onChange={(e) => onSkipListeningChange?.(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-[18px] bg-stone-200 peer-focus:outline-none rounded-full peer-checked:bg-amber-400 transition-colors"></div>
            <div className="absolute left-[2px] top-[2px] bg-white w-[14px] h-[14px] rounded-full transition-transform peer-checked:translate-x-[14px] shadow-sm"></div>
          </div>
        </label>
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
                  isPhase1Unlocked(index),
                  1
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-stone-700 mb-3 flex items-center gap-2">
              {t.phase2}
            </h3>
            {phase2Units.length === 0 || (phase2Units.length === 1 && phase2Units[0]?.no_eligible_sentences) ? (
              <p className="text-sm text-stone-400 py-2">暂无可练习内容</p>
            ) : (
            <div className="flex flex-wrap gap-2">
              {phase2Units.map((unit, index) =>
                renderUnitCard(
                  unit,
                  index,
                  index === currentPhase2Unit,
                  () => onPhase2UnitClick(index),
                  'phase2',
                  isPhase2Unlocked(index),
                  2
                )
              )}
            </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default AllUnitsStep;
