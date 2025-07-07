import * as React from "react"
import { cn } from "@/lib/utils"

export interface StatusIndicatorProps {
  status: 'live' | 'processing' | 'completed' | 'error' | 'warning'
  children: React.ReactNode
  className?: string
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ status, children, className }, ref) => {
    const statusStyles = {
      live: 'status-live',
      processing: 'bg-amber-muted/80 text-amber-800 px-3 py-1 rounded-xl font-sans font-bold uppercase tracking-wider text-xs flex items-center gap-2',
      completed: 'bg-sage-accent/80 text-white px-3 py-1 rounded-xl font-sans font-bold uppercase tracking-wider text-xs flex items-center gap-2',
      error: 'bg-terracotta-accent/80 text-white px-3 py-1 rounded-xl font-sans font-bold uppercase tracking-wider text-xs flex items-center gap-2',
      warning: 'bg-amber-muted/80 text-amber-800 px-3 py-1 rounded-xl font-sans font-bold uppercase tracking-wider text-xs flex items-center gap-2'
    }
    
    return (
      <div
        ref={ref}
        className={cn(statusStyles[status], className)}
      >
        {status === 'live' && (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        )}
        {status === 'processing' && (
          <div className="w-2 h-2 bg-amber-800 rounded-full animate-pulse" />
        )}
        {status === 'completed' && (
          <div className="w-2 h-2 bg-white rounded-full" />
        )}
        {status === 'error' && (
          <div className="w-2 h-2 bg-white rounded-full" />
        )}
        {status === 'warning' && (
          <div className="w-2 h-2 bg-amber-800 rounded-full" />
        )}
        {children}
      </div>
    )
  }
)
StatusIndicator.displayName = "StatusIndicator"

export { StatusIndicator } 