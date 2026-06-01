import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Star, Headphones, Loader2, Home } from 'lucide-react';

function AllUnitsStep({
  phase1Units,
  phase2Units,
  currentPhase1Unit,
  currentPhase2Unit,
  onPhase1UnitClick,
  onPhase2UnitClick,
  onBack,
  onHome,
  loading,
  t,
  unitStarCounts,
  skipListening,
  onSkipListeningChange,
  generatingUnits,
  fileTitle,
  currentFileId
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

  const phase1Completed = phase1Units.filter(u => u.completed).length;
  const phase2Completed = phase2Units.filter(u => u.completed).length;

  const renderUnitCard = (unit, index, onClick, keyPrefix, isUnlocked, phaseNumber) => {
    const isCompleted = unit.completed;
    const isGenerating = phaseNumber === 1 && generatingUnits?.has(index);
    const isLocked = !isUnlocked && !isCompleted && !isGenerating;
    const isCurrent = (phaseNumber === 1 && index === currentPhase1Unit) || (phaseNumber === 2 && index === currentPhase2Unit);
    const starKey = `${phaseNumber}-${index}`;
    const starCount = unitStarCounts?.[starKey];

    return (
      <motion.button
        key={`${keyPrefix}-unit-${index}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.25 }}
        whileHover={!isLocked && !isGenerating ? { y: -1 } : {}}
        whileTap={!isLocked && !isGenerating ? { scale: 0.96 } : {}}
        onClick={isLocked || isGenerating ? undefined : onClick}
        disabled={isLocked || isGenerating}
        className={`relative flex flex-col items-center justify-center rounded-lg transition-colors ${
          isCompleted
            ? 'bg-stone-800 text-white hover:bg-stone-700'
            : isGenerating
            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
            : isLocked
            ? 'bg-stone-50 text-stone-300 cursor-not-allowed'
            : isCurrent
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}
        style={{ width: '3rem', height: '3rem' }}
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isLocked ? (
          <Lock className="w-3.5 h-3.5" />
        ) : isCompleted ? (
          <>
            <span className="text-xs font-bold">{index + 1}</span>
            {typeof starCount === 'number' && (
              <div className="flex items-center gap-px mt-0.5">
                {[0, 1, 2].map((i) => (
                  <Star
                    key={i}
                    className={`w-2 h-2 ${i < starCount ? 'text-amber-400 fill-amber-400' : 'text-stone-500 fill-stone-500'}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <span className="text-xs font-bold">{index + 1}</span>
        )}
      </motion.button>
    );
  };

  const renderPhaseSection = (title, units, currentUnit, onClick, keyPrefix, isUnlockedFn, phaseNumber, completed) => {
    const total = units.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-stone-700">{title}</h3>
          <span className="text-xs text-stone-400">{completed}/{total}</span>
        </div>

        <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-amber-400"
          />
        </div>

        {phaseNumber === 2 && (units.length === 0 || (units.length === 1 && units[0]?.no_eligible_sentences)) ? (
          <p className="text-sm text-stone-400 py-3 text-center">{t.noPracticeContent || '暂无可练习内容'}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {units.map((unit, index) =>
              renderUnitCard(
                unit,
                index,
                () => onClick(index),
                keyPrefix,
                isUnlockedFn(index),
                phaseNumber
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="p-2 text-stone-400 hover:text-stone-700 transition-colors rounded-lg hover:bg-stone-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {fileTitle && (
          <span className="text-sm font-medium text-stone-500 truncate max-w-[280px]">
            {fileTitle}
          </span>
        )}

        <div className="flex-1 min-w-0" />

        <label className="flex items-center gap-2 cursor-pointer select-none group mr-1">
          <span className="text-[11px] text-stone-400 group-hover:text-stone-600 transition-colors flex items-center gap-1">
            <Headphones className="w-3 h-3" />
            {t.skipListening || '跳过听力'}
          </span>
          <div className="relative">
            <input
              type="checkbox"
              checked={skipListening || false}
              onChange={(e) => onSkipListeningChange?.(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-[18px] bg-stone-200 peer-focus:outline-none rounded-full peer-checked:bg-amber-400 transition-colors" />
            <div className="absolute left-[2px] top-[2px] bg-white w-[14px] h-[14px] rounded-full transition-transform peer-checked:translate-x-[14px] shadow-sm" />
          </div>
        </label>

        <button
          onClick={onHome}
          className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          title={t.backToHome || '返回主页'}
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-stone-800 mb-1">
          {t.learningUnits || '学习单元'}
        </h2>
        <p className="text-sm text-stone-400">{t.completeUnitsInOrder || '按顺序完成单元，解锁下一单元'}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <p className="text-sm text-stone-400">{t.loading}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-6 space-y-8">
          {renderPhaseSection(
            t.phase1,
            phase1Units,
            currentPhase1Unit,
            onPhase1UnitClick,
            'phase1',
            isPhase1Unlocked,
            1,
            phase1Completed
          )}

          <div className="border-t border-stone-100" />

          {renderPhaseSection(
            t.phase2,
            phase2Units,
            currentPhase2Unit,
            onPhase2UnitClick,
            'phase2',
            isPhase2Unlocked,
            2,
            phase2Completed
          )}
        </div>
      )}
    </motion.div>
  );
}

export default AllUnitsStep;
