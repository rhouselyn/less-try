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
        transition={{ delay: index * 0.04, duration: 0.3 }}
        whileHover={!isLocked && !isGenerating ? { y: -2, transition: { duration: 0.15 } } : {}}
        whileTap={!isLocked && !isGenerating ? { scale: 0.97 } : {}}
        onClick={isLocked || isGenerating ? undefined : onClick}
        disabled={isLocked || isGenerating}
        className={`relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 ${
          isCompleted
            ? 'bg-white shadow-sm border border-emerald-200/60 hover:shadow-md hover:border-emerald-300/80'
            : isGenerating
            ? 'bg-amber-50/60 border border-amber-200/40 cursor-not-allowed'
            : isLocked
            ? 'bg-stone-50 border border-stone-200/40 cursor-not-allowed'
            : isCurrent
            ? 'bg-white shadow-md border-2 border-amber-300/80 hover:shadow-lg'
            : 'bg-white shadow-sm border border-stone-200/60 hover:shadow-md hover:border-amber-200/60'
        }`}
        style={{ width: '4.5rem', height: '4.5rem' }}
      >
        {isGenerating ? (
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        ) : isLocked ? (
          <Lock className="w-4 h-4 text-stone-300" />
        ) : isCompleted ? (
          <>
            <span className="text-sm font-semibold text-emerald-600">{index + 1}</span>
            {typeof starCount === 'number' && (
              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                {[0, 1, 2].map((i) => (
                  <Star
                    key={i}
                    className={`w-2.5 h-2.5 ${
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
            <span className={`text-sm font-semibold ${isCurrent ? 'text-amber-600' : 'text-stone-500'}`}>{index + 1}</span>
            <div className={`w-1 h-1 rounded-full mt-1 ${isCurrent ? 'bg-amber-400' : 'bg-stone-300'}`} />
          </>
        )}
      </motion.button>
    );
  };

  const renderPhaseSection = (title, subtitle, Icon, units, currentUnit, onClick, keyPrefix, isUnlockedFn, phaseNumber, completed, total) => {
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: phaseNumber === 1 ? 0.1 : 0.2 }}
        className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden"
      >
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                phaseNumber === 1 ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
              }`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-stone-800 leading-tight">{title}</h3>
                <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-stone-500">{completed}<span className="text-stone-300">/{total}</span></span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                phaseNumber === 1 ? 'bg-emerald-400' : 'bg-blue-400'
              }`}
            />
          </div>

          {phaseNumber === 2 && (units.length === 0 || (units.length === 1 && units[0]?.no_eligible_sentences)) ? (
            <p className="text-sm text-stone-400 py-4 text-center">{t.noPracticeContent || '暂无可练习内容'}</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
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
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="p-2 text-stone-400 hover:text-stone-700 transition-colors rounded-xl hover:bg-stone-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {fileTitle && (
          <span className="text-sm font-medium text-stone-500 truncate max-w-[280px]">
            {fileTitle}
          </span>
        )}

        <div className="flex-1 min-w-0" />

        <button
          onClick={onHome}
          className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
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
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          <p className="text-sm text-stone-400">{t.loading}</p>
        </div>
      ) : (
        <div className="space-y-5">
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

      <div className="mt-6 flex justify-center">
        <label className="flex items-center gap-2.5 cursor-pointer select-none group">
          <div className="relative">
            <input
              type="checkbox"
              checked={skipListening || false}
              onChange={(e) => onSkipListeningChange?.(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer-checked:bg-amber-400 transition-colors" />
            <div className="absolute left-[2px] top-[2px] bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
          </div>
          <span className="text-xs text-stone-400 group-hover:text-stone-600 transition-colors flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5" />
            {t.skipListening || '跳过听力'}
          </span>
        </label>
      </div>
    </motion.div>
  );
}

export default AllUnitsStep;
