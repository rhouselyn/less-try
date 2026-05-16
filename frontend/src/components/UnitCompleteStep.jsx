import { motion } from 'framer-motion'
import { ChevronRight, Trophy, Star, Sparkles, RotateCcw } from 'lucide-react'

function UnitCompleteStep({ unitNumber, totalUnits, phase, onContinue, onReview, errorCount, hasWrongItems, wrongItemsCount, t }) {
  const starCount = Math.max(0, 3 - Math.floor(errorCount / 3))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      <div className="bg-white border border-stone-200/80 rounded-2xl p-12 shadow-sm text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
          className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <Trophy className="w-12 h-12 text-amber-600" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-stone-800 mb-4"
        >
          🎉 单元完成！
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-stone-600 mb-2"
        >
          {phase === 1 ? '阶段一' : '阶段二'} · 第 {unitNumber + 1} 单元
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-base text-stone-500 mb-8"
        >
          {errorCount === 0
            ? '太棒了！全部答对，完美表现！'
            : `答错 ${errorCount} 题，再接再厉！`}
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
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-stone-200 fill-stone-200'
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
            className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl"
          >
            <div className="flex items-center gap-2 justify-center mb-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span className="text-amber-800 font-medium">错题复习</span>
            </div>
            <p className="text-sm text-amber-700">
              你有 {wrongItemsCount ?? errorCount} 道错题需要复习，完成后才能继续
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-3"
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span className="text-stone-500 text-sm">
            {unitNumber + 1 < totalUnits
              ? `还有 ${totalUnits - unitNumber - 1} 个单元等你挑战`
              : '恭喜完成所有单元！'}
          </span>
          <Sparkles className="w-5 h-5 text-amber-500" />
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
              className="px-10 py-4 bg-amber-500 text-white font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              开始错题复习
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.97, y: 0 }}
              onClick={onContinue}
              className="px-10 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-2"
            >
              继续学习
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

export default UnitCompleteStep
