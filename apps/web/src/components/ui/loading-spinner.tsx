import * as React from "react"
import { cn } from "@/lib/utils"

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'glass'
  className?: string
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = 'md', variant = 'default', className }, ref) => {
    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12'
    }
    
    const variants = {
      default: 'border-2 border-stone-300 border-t-stone-600',
      glass: 'border-2 border-white/30 border-t-white'
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full",
          sizes[size],
          variants[variant],
          className
        )}
      />
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner } 