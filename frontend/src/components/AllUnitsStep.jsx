import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock, Star, Headphones, Loader2, Home, Check } from 'lucide-react'

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
    if (index === 0) return true
    for (let i = 0; i < index; i++) {
      if (!phase1Units[i]?.completed) return false
    }
    return true
  }

  const isPhase2Unlocked = (index) => {
    if (index === 0) return true
    for (let i = 0; i < index; i++) {
      if (!phase2Units[i]?.completed) return false
    }
    return true
  }

  const renderUnitNode = (unit, index, onClick, keyPrefix, isUnlocked, phaseNumber, currentUnit) => {
    const isCompleted = unit.completed
    const isGenerating = phaseNumber === 1 && generatingUnits?.has(index)
    const isLocked = !isUnlocked && !isCompleted && !isGenerating
    const isCurrent = index === currentUnit && !isCompleted
    const starKey = `${phaseNumber}-${index}`
    const starCount = unitStarCounts?.[starKey]

    const node = (
      <motion.button
        key={`${keyPrefix}-unit-${index}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        onClick={isLocked || isGenerating ? undefined : onClick}
        disabled={isLocked || isGenerating}
        className={`group relative flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${
          isLocked
            ? 'opacity-40 cursor-not-allowed'
            : isGenerating
            ? 'cursor-not-allowed'
            : isCompleted
            ? 'hover:bg-emerald-50/60'
            : isCurrent
            ? 'bg-amber-50/80 shadow-sm ring-1 ring-amber-200/60'
            : 'hover:bg-amber-50/40'
        }`}
      >
        <div
          className={`relative flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-all duration-200 ${
            isCompleted
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
              : isGenerating
              ? 'bg-amber-100 text-amber-500'
              : isLocked
              ? 'bg-stone-100 text-stone-300'
              : isCurrent
              ? 'bg-amber-400 text-white shadow-sm shadow-amber-200'
              : 'bg-stone-100 text-stone-400 group-hover:bg-amber-100 group-hover:text-amber-600'
          }`}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isLocked ? (
            <Lock className="w-3.5 h-3.5" />
          ) : isCompleted ? (
            <Check className="w-4 h-4" strokeWidth={3} />
          ) : (
            <span className="text-sm font-semibold">{index + 1}</span>
          )}
          {isCurrent && !isCompleted && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-amber-400"
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
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
            {isCompleted && typeof starCount === 'number' && (
              <div className="flex items-center gap-0.5">
                {[0, 1, 2].map((i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < starCount ? 'text-amber-400 fill-amber-400' : 'text-stone-200 fill-stone-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <p
            className={`text-xs mt-0.5 ${
              isCompleted ? 'text-emerald-500' : isLocked ? 'text-stone-300' : 'text-stone-400'
            }`}
          >
            {isCompleted
              ? t.completed || '已完成'
              : isGenerating
              ? t.generating || '生成中...'
              : isLocked
              ? t.locked || '未解锁'
              : isCurrent
              ? t.inProgress || '进行中'
              : t.notStarted || '未开始'}
          </p>
        </div>

        {!isLocked && !isGenerating && (
          <div
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-600'
                : isCurrent
                ? 'bg-amber-100 text-amber-600'
                : 'bg-stone-50 text-stone-400'
            }`}
          >
            {unit.word_count || (index + 1) * 10}
          </div>
        )}
      </motion.button>
    )

    return node
  }

  const phase1Completed = phase1Units.filter((u) => u.completed).length
  const phase2Completed = phase2Units.filter((u) => u.completed).length
  const phase1Total = phase1Units.length
  const phase2Total = phase2Units.length

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

        {fileTitle && (
          <span className="text-sm font-medium text-stone-500 truncate max-w-[280px]">
            {fileTitle}
          </span>
        )}

        <button
          onClick={onHome}
          className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
          title={t.backToHome || '返回主页'}
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-10">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-stone-800 tracking-tight"
        >
          {t.learningUnits || '学习单元'}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-stone-400 mt-1.5"
        >
          {t.completeUnitsInOrder || '按顺序完成单元，解锁下一单元'}
        </motion.p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          <p className="text-sm text-stone-400">{t.loading}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-emerald-400" />
                <h2 className="text-sm font-semibold text-stone-700">{t.phase1}</h2>
              </div>
              <span className="text-xs text-stone-400 tabular-nums">
                {phase1Completed}/{phase1Total}
              </span>
            </div>
            {phase1Total > 0 && (
              <div className="w-full h-1 rounded-full bg-stone-100 mb-4 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(phase1Completed / phase1Total) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                />
              </div>
            )}
            <div className="space-y-1">
              {phase1Units.map((unit, index) =>
                renderUnitNode(
                  unit,
                  index,
                  () => onPhase1UnitClick(index),
                  'phase1',
                  isPhase1Unlocked(index),
                  1,
                  currentPhase1Unit
                )
              )}
            </div>
          </motion.section>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-stone-200/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
            <div className="flex-1 h-px bg-stone-200/60" />
          </div>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-amber-400" />
                <h2 className="text-sm font-semibold text-stone-700">{t.phase2}</h2>
              </div>
              <span className="text-xs text-stone-400 tabular-nums">
                {phase2Completed}/{phase2Total}
              </span>
            </div>
            {phase2Units.length === 0 ||
            (phase2Units.length === 1 && phase2Units[0]?.no_eligible_sentences) ? (
              <p className="text-sm text-stone-400 py-4 text-center">{t.noContent || '暂无可练习内容'}</p>
            ) : (
              <>
                {phase2Total > 0 && (
                  <div className="w-full h-1 rounded-full bg-stone-100 mb-4 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-amber-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${(phase2Completed / phase2Total) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  {phase2Units.map((unit, index) =>
                    renderUnitNode(
                      unit,
                      index,
                      () => onPhase2UnitClick(index),
                      'phase2',
                      isPhase2Unlocked(index),
                      2,
                      currentPhase2Unit
                    )
                  )}
                </div>
              </>
            )}
          </motion.section>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 pt-6 border-t border-stone-100"
      >
        <label className="flex items-center justify-between cursor-pointer select-none group">
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-stone-400" />
            <span className="text-sm text-stone-500 group-hover:text-stone-700 transition-colors">
              {t.skipListening || '跳过听力'}
            </span>
          </div>
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
        </label>
      </motion.div>
    </motion.div>
  )
}

export default AllUnitsStep
