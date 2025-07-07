import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export interface GlassModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  overlayClassName?: string
  sizeClassName?: string
}

const GlassModal = React.forwardRef<HTMLDivElement, GlassModalProps>(
  ({ isOpen, onClose, children, className, overlayClassName, sizeClassName }, ref) => {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/90 backdrop-blur", overlayClassName)}
            style={{ WebkitBackdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              ref={ref}
              className={cn("glass-modal relative z-10 w-full", sizeClassName, className)}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              layout
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
)
GlassModal.displayName = "GlassModal"

export { GlassModal } 