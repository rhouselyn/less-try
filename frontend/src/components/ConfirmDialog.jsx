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
            className="absolute inset-0 bg-[#1a1a2e]/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="relative bg-white border-[3px] border-[#1a1a2e] shadow-[4px_4px_0_#1a1a2e] w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onCancel}
              className="absolute top-3.5 right-3.5 p-1 text-[#7a7a9a] hover:text-[#4a4a6a] border-[3px] border-[#1a1a2e] hover:bg-[#ff006e] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-7 pb-2 text-center">
              <div className="w-11 h-11 bg-[#fff0f5] border-[3px] border-[#ff006e] flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-5 h-5 text-[#ff006e]" />
              </div>
              {title && (
                <h3 className="font-display text-[15px] font-black uppercase text-[#1a1a2e] mb-1.5">{title}</h3>
              )}
              {message && (
                <p className="text-[13px] text-[#4a4a6a] leading-relaxed">{message}</p>
              )}
            </div>

            <div className="px-5 py-4 flex gap-2.5">
              <motion.button
                onClick={onCancel}
                className="btn-secondary flex-1 py-2.5 text-[13px] font-bold text-[#2d2d4a] bg-[#f0f0ff] hover:bg-[#e0e0f0] border-[3px] border-[#1a1a2e] transition-colors"
              >
                {cancelText || '继续练习'}
              </motion.button>
              <motion.button
                onClick={onConfirm}
                className="flex-1 py-2.5 text-[13px] font-black uppercase text-white bg-[#ef476f] hover:bg-[#cc0058] border-[3px] border-[#1a1a2e] transition-colors"
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
