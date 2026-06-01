
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Star, Headphones, Loader2, Home, Zap, BookOpen, Swords } from 'lucide-react';

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

  const renderUnit = (unit, index, onClick, keyPrefix, isUnlocked, phaseNumber) => {
    const isCompleted = unit.completed;
    const isGenerating = phaseNumber === 1 && generatingUnits?.has(index);
    const isLocked = !isUnlocked && !isCompleted && !isGenerating;
    const isCurrent = phaseNumber === 1 ? index === currentPhase1Unit : index === currentPhase2Unit;
    const starKey = `${phaseNumber}-${index}`;
    const starCount = unitStarCounts?.[starKey];

    return (
      <motion.button
        key={`${keyPrefix}-unit-${index}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
        onClick={isLocked || isGenerating ? undefined : onClick}
        disabled={isLocked || isGenerating}
        className={`group relative flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${
          isLocked
            ? 'opacity-40 cursor-not-allowed'
            : isGenerating
            ? 'cursor-not-allowed'
            : isCompleted
            ? 'hover:bg-emerald-50/50'
            : isCurrent
            ? 'hover:bg-amber-50/80'
            : 'hover:bg-stone-50'
        }`}
      >
        <div
          className={`relative flex items-center justify-center rounded-xl shrink-0 transition-all duration-300 ${
            isCompleted
              ? 'w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-200/50'
              : isGenerating
              ? 'w-10 h-10 bg-gradient-to-br from-amber-300 to-amber-400 shadow-lg shadow-amber-200/50'
              : isLocked
              ? 'w-10 h-10 bg-stone-200'
              : isCurrent
              ? 'w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 shadow-lg shadow-amber-200/50'
              : 'w-10 h-10 bg-white border-2 border-stone-200'
          }`}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : isLocked ? (
            <Lock className="w-4 h-4 text-stone-400" />
          ) : isCompleted ? (
            <span className="text-sm font-bold text-white">{index + 1}</span>
          ) : isCurrent ? (
            <Zap className="w-4 h-4 text-white" />
          ) : (
            <span className="text-sm font-semibold text-stone-400">{index + 1}</span>
          )}
          {isCurrent && !isCompleted && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-amber-400"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${
                isCompleted
                  ? 'text-emerald-700'
                  : isLocked
                  ? 'text-stone-400'
                  : isCurrent
                  ? 'text-amber-700'
                  : 'text-stone-600'
              }`}
            >
              {t.unit || '单元'} {index + 1}
            </span>
            {isCompleted && (
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full font-medium">
                {t.completed || '已完成'}
              </span>
            )}
            {isCurrent && !isCompleted && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full font-medium">
                {t.current || '当前'}
              </span>
            )}
          </div>
          {isCompleted && typeof starCount === 'number' && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {[0, 1, 2].map((i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < starCount
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-stone-200 fill-stone-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {!isLocked && !isGenerating && (
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isCompleted ? 'bg-emerald-400' : isCurrent ? 'bg-amber-400' : 'bg-stone-300'
            }`}
          />
        )}
      </motion.button>
    );
  };

  const phase1Completed = phase1Units.filter((u) => u.completed).length;
  const phase1Total = phase1Units.length;
  const phase1Progress = phase1Total > 0 ? (phase1Completed / phase1Total) * 100 : 0;

  const phase2Completed = phase2Units.filter((u) => u.completed).length;
  const phase2Total = phase2Units.length;
  const phase2Progress = phase2Total > 0 ? (phase2Completed / phase2Total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="p-2 text-stone-400 hover:text-stone-700 transition-colors rounded-xl hover:bg-stone-100"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0 text-center px-4">
          {fileTitle && (
            <span className="text-sm font-medium text-stone-500 truncate block">
              {fileTitle}
            </span>
          )}
        </div>

        <button
          onClick={onHome}
          className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
          title={t.backToHome || '返回主页'}
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center mb-10">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold text-stone-800 mb-2 tracking-tight"
        >
          {t.learningUnits || '学习单元'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-stone-400"
        >
          {t.completeUnitsInOrder || '按顺序完成单元，解锁下一单元'}
        </motion.p>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-stone-400">{t.loading}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-200/50">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-700">{t.phase1}</h3>
                  <p className="text-[11px] text-stone-400">
                    {phase1Completed}/{phase1Total} {t.completed || '已完成'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${phase1Progress}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[11px] font-medium text-stone-400 tabular-nums">
                  {Math.round(phase1Progress)}%
                </span>
              </div>
            </div>
            <div className="p-2">
              {phase1Units.map((unit, index) =>
                renderUnit(
                  unit,
                  index,
                  () => onPhase1UnitClick(index),
                  'phase1',
                  isPhase1Unlocked(index),
                  1
                )
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-sm shadow-amber-200/50">
                  <Swords className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-700">{t.phase2}</h3>
                  <p className="text-[11px] text-stone-400">
                    {phase2Completed}/{phase2Total} {t.completed || '已完成'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${phase2Progress}%` }}
                    transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[11px] font-medium text-stone-400 tabular-nums">
                  {Math.round(phase2Progress)}%
                </span>
              </div>
            </div>
            <div className="p-2">
              {phase2Units.length === 0 || (phase2Units.length === 1 && phase2Units[0]?.no_eligible_sentences) ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-stone-400">{t.noContent || '暂无可练习内容'}</p>
                </div>
              ) : (
                phase2Units.map((unit, index) =>
                  renderUnit(
                    unit,
                    index,
                    () => onPhase2UnitClick(index),
                    'phase2',
                    isPhase2Unlocked(index),
                    2
                  )
                )
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex items-center justify-center gap-3 pt-2"
          >
            <label className="flex items-center gap-2 cursor-pointer select-none group">
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
                <div className="w-8 h-[18px] bg-stone-200 peer-focus:outline-none rounded-full peer-checked:bg-amber-400 transition-colors" />
                <div className="absolute left-[2px] top-[2px] bg-white w-[14px] h-[14px] rounded-full transition-transform peer-checked:translate-x-[14px] shadow-sm" />
              </div>
            </label>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export default AllUnitsStep;
