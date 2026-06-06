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
            className="absolute inset-0 bg-umber-800/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="relative bg-white/80 border border-stone-300 rounded-3xl shadow-impasto-lg w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onCancel}
              className="absolute top-3.5 right-3.5 p-1 text-umber-400 hover:text-umber-500 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-7 pb-2 text-center">
              <div className="w-11 h-11 rounded-full bg-cadmium-50 border border-cadmium-100/80 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-5 h-5 text-cadmium-500" />
              </div>
              {title && (
                <h3 className="font-display text-[15px] font-semibold text-umber-700 mb-1.5">{title}</h3>
              )}
              {message && (
                <p className="text-[13px] text-umber-500 leading-relaxed">{message}</p>
              )}
            </div>

            <div className="px-5 py-4 flex gap-2.5">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                className="btn-secondary flex-1 py-2.5 text-[13px]"
              >
                {cancelText || '继续练习'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                className="flex-1 py-2.5 text-[13px] font-semibold text-vermilion-700 bg-vermilion-100 hover:bg-vermilion-200 rounded-2xl transition-colors"
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
