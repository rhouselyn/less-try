import { motion } from 'framer-motion'
import { ChevronRight, Trophy, Star, Sparkles } from 'lucide-react'

function UnitCompleteStep({ unitNumber, totalUnits, phase, onContinue, t }) {
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
          你已完成本单元的所有学习内容，继续加油！
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
              <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
            </motion.div>
          ))}
        </motion.div>

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

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
          whileTap={{ scale: 0.97, y: 0 }}
          onClick={onContinue}
          className="mt-10 px-10 py-4 bg-stone-800 text-white font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-2 mx-auto"
        >
          继续学习
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  )
}

export default UnitCompleteStep
