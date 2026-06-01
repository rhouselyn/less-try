import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Star, Headphones, Loader2, Home, BookOpen, PenTool } from 'lucide-react';

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
  const phase1Total = phase1Units.length;
  const phase2Total = phase2Units.length;

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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.25 }}
        whileHover={!isLocked && !isGenerating ? { y: -2, transition: { duration: 0.15 } } : {}}
        whileTap={!isLocked && !isGenerating ? { scale: 0.97 } : {}}
        onClick={isLocked || isGenerating ? undefined : onClick}
        disabled={isLocked || isGenerating}
        className={`relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 ${
          isCompleted
            ? 'bg-emerald-50/80 border border-emerald-200/50 hover:bg-emerald-50'
            : isGenerating
            ? 'bg-amber-50/50 border border-amber-200/30 cursor-not-allowed'
            : isLocked
            ? 'bg-stone-50/50 border border-stone-200/30 cursor-not-allowed'
            : isCurrent
            ? 'bg-amber-50/60 border border-amber-300/70 shadow-sm'
            : 'bg-white border border-stone-200/50 hover:border-amber-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
        }`}
        style={{ width: '3.75rem', height: '3.75rem' }}
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        ) : isLocked ? (
          <Lock className="w-3.5 h-3.5 text-stone-300" />
        ) : isCompleted ? (
          <>
            <span className="text-[13px] font-semibold text-emerald-600">{index + 1}</span>
            {typeof starCount === 'number' && (
              <div className="flex items-center justify-center gap-px mt-0.5">
                {[0, 1, 2].map((i) => (
                  <Star
                    key={i}
                    className={`w-2 h-2 ${
                      i < starCount
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-stone-200 fill-stone-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <span className={`text-[13px] font-semibold ${isCurrent ? 'text-amber-600' : 'text-stone-500'}`}>{index + 1}</span>
            {isCurrent && <div className="w-1 h-1 rounded-full mt-0.5 bg-amber-400" />}
          </>
        )}
      </motion.button>
    );
  };

  const renderPhaseSection = (title, subtitle, Icon, units, currentUnit, onClick, keyPrefix, isUnlockedFn, phaseNumber, completed, total) => {
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: phaseNumber === 1 ? 0.05 : 0.12 }}
        className="bg-white rounded-2xl border border-stone-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <div className="px-5 pt-4 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              phaseNumber === 1 ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
            }`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-stone-800 leading-tight">{title}</h3>
              <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>
            </div>
            <span className="text-[11px] font-medium text-stone-400 tabular-nums">{completed}<span className="text-stone-300">/{total}</span></span>
          </div>

          <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                phaseNumber === 1 ? 'bg-emerald-400' : 'bg-blue-400'
              }`}
            />
          </div>

          {phaseNumber === 2 && (units.length === 0 || (units.length === 1 && units[0]?.no_eligible_sentences)) ? (
            <p className="text-xs text-stone-400 py-3 text-center">{t.noPracticeContent || '暂无可练习内容'}</p>
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
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={onBack}
          className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors rounded-lg hover:bg-stone-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {fileTitle && (
          <span className="text-sm font-medium text-stone-500 truncate max-w-[240px]">
            {fileTitle}
          </span>
        )}

        <div className="flex-1 min-w-0" />

        <label className="flex items-center gap-1.5 cursor-pointer select-none group mr-1">
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
            <div className="w-7 h-4 bg-stone-200 peer-focus:outline-none rounded-full peer-checked:bg-amber-400 transition-colors" />
            <div className="absolute left-[1.5px] top-[1.5px] bg-white w-[13px] h-[13px] rounded-full transition-transform peer-checked:translate-x-3 shadow-sm" />
          </div>
        </label>

        <button
          onClick={onHome}
          className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          title={t.backToHome || '返回主页'}
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-stone-800">
          {t.learningUnits || '学习单元'}
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">{t.completeUnitsInOrder || '按顺序完成单元，解锁下一单元'}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <p className="text-xs text-stone-400">{t.loading}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {renderPhaseSection(
            t.phase1,
            t.phase1Desc || '单词认知与记忆',
            BookOpen,
            phase1Units,
            currentPhase1Unit,
            onPhase1UnitClick,
            'phase1',
            isPhase1Unlocked,
            1,
            phase1Completed,
            phase1Total
          )}

          {renderPhaseSection(
            t.phase2,
            t.phase2Desc || '句子理解与运用',
            PenTool,
            phase2Units,
            currentPhase2Unit,
            onPhase2UnitClick,
            'phase2',
            isPhase2Unlocked,
            2,
            phase2Completed,
            phase2Total
          )}
        </div>
      )}
    </motion.div>
  );
}

export default AllUnitsStep;
