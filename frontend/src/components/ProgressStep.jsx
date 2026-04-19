import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

function ProgressStep({ units, unitProgress, onStartUnit, onBack, loading, t }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      {/* 返回按钮 */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.backToVocab}
      </motion.button>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">学习进度</h2>
        
        <div className="space-y-4">
          {units.map((unit, index) => (
            <motion.div
              key={unit.unit_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-lg border transition-all ${unit.is_current ? 'border-black bg-slate-50' : unit.is_completed ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-slate-900">
                  单元 {unit.unit_id + 1} {unit.is_current && '(当前)'}
                </h3>
                <span className="text-sm text-slate-500">{unit.word_count} 个单词</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {unit.is_completed && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  <span className="text-sm text-slate-600">
                    {unit.is_completed ? '已完成' : unit.is_current ? '进行中' : '未开始'}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStartUnit(unit.unit_id)}
                  disabled={!unit.is_completed && !unit.is_current}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${unit.is_completed || unit.is_current ? 'bg-black text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-500 cursor-not-allowed'}`}
                >
                  {unit.is_completed ? '复习' : '开始学习'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default ProgressStep
