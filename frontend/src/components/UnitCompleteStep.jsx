import { motion } from 'framer-motion'
import { ChevronRight, Trophy, Star, Sparkles, RotateCcw, X } from 'lucide-react'

function UnitCompleteStep({ unitNumber, totalUnits, phase, onContinue, onReview, errorCount, hasWrongItems, wrongItemsCount, t, onSkipReview }) {
  const starCount = Math.max(0, 3 - Math.floor(errorCount / 3))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto relative"
    >
      {hasWrongItems && onSkipReview && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onSkipReview}
          className="absolute -top-2 left-0 z-10 flex items-center gap-1.5 btn-ghost text-xs border border-bone-200 hover:border-bone-300"
        >
          <X className="w-3 h-3" />
          {t.skipReview || '不想复习了'}
        </motion.button>
      )}
      <div className="bg-cream-50 border-2 border-ochre-400 rounded-none p-12 shadow-warm text-center font-serif">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
          className="w-24 h-24 bg-ochre-50 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <Trophy className="w-12 h-12 text-ochre-500" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold font-serif text-ink-800 mb-4"
        >
          🎉 {t.unitComplete || '单元完成！'}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-ink-600 mb-2"
        >
          {phase === 1 ? (t.phase1 || '阶段一') : (t.phase2 || '阶段二')} · {(t.unitNumberFormat || '第 {0} 单元').replace('{0}', unitNumber + 1)}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-base text-ink-500 mb-8"
        >
          {errorCount === 0
            ? (t.perfectScore || '太棒了！全部答对，完美表现！')
            : (t.errorsMade || '答错 {0} 题，再接再厉！').replace('{0}', errorCount)}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10, delay: 0.7 + i * 0.15 }}
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  i < starCount
                    ? 'text-ochre-400 fill-ochre-400'
                    : 'text-bone-300 fill-bone-300'
                }`}
              />
            </motion.div>
          ))}
        </motion.div>

        {hasWrongItems && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-8 p-4 bg-ochre-50 border-2 border-ochre-400 rounded-none"
          >
            <div className="flex items-center gap-2 justify-center mb-2">
              <RotateCcw className="w-4 h-4 text-ochre-500" />
              <span className="text-ink-700 font-medium">{t.wrongItemReview || '错题复习'}</span>
            </div>
            <p className="text-sm text-ink-500">
              {(t.wrongItemsToReview || '你有 {0} 道错题需要复习').replace('{0}', wrongItemsCount ?? errorCount)}
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-3"
        >
          <Sparkles className="w-5 h-5 text-ochre-500" />
          <span className="text-ink-500 text-sm">
            {unitNumber + 1 < totalUnits
              ? (t.moreUnitsToGo || '还有 {0} 个单元等你挑战').replace('{0}', totalUnits - unitNumber - 1)
              : (t.congratsAllUnits || '恭喜完成所有单元！')}
          </span>
          <Sparkles className="w-5 h-5 text-ochre-500" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-10 flex items-center justify-center gap-4"
        >
          {hasWrongItems ? (
            <motion.button
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={onReview}
              className="btn-primary text-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              {t.startWrongItemReview || '开始错题复习'}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={onContinue}
              className="btn-primary text-lg flex items-center justify-center gap-2"
            >
              {t.continueLearning || '继续学习'}
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

export default UnitCompleteStep
