import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

function ConfirmDialog({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="relative bg-white rounded-3xl shadow-soft-xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onCancel}
              className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-slate-500 rounded-2xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-7 pb-2 text-center">
              <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-100/80 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              {title && (
                <h3 className="font-display text-[15px] font-semibold text-slate-700 mb-1.5">{title}</h3>
              )}
              {message && (
                <p className="text-[13px] text-slate-500 leading-relaxed">{message}</p>
              )}
            </div>

            <div className="px-5 py-4 flex gap-2.5">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                className="btn-secondary flex-1 py-2.5 text-[13px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors px-6 shadow-soft-lg hover:-translate-y-0.5 hover:shadow-soft-xl duration-200"
              >
                {cancelText || '继续练习'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-2xl transition-colors px-6 shadow-soft-lg hover:-translate-y-0.5 hover:shadow-soft-xl duration-200"
              >
                {confirmText || '退出'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ConfirmDialog
