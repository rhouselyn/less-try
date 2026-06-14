import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'

function AlertDialog({ open, title, message, onClose, t }) {
  const closeRef = useRef(null)

  useEffect(() => {
    if (open) {
      closeRef.current?.focus()
      const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 p-5">
              <div className="shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                {title && (
                  <h3 className="text-sm font-semibold text-ink-800 mb-1">{title}</h3>
                )}
                <p className="text-sm text-ink-600 leading-relaxed">{message}</p>
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                className="shrink-0 p-1 text-ink-300 hover:text-ink-500 transition-colors rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="border-t border-parchment-100 px-5 py-3 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors"
              >
                {t?.ok || '确定'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AlertDialog
