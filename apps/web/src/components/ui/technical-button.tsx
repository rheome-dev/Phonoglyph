import * as React from "react"
import { cn } from "@/lib/utils"

export interface TechnicalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const TechnicalButton = React.forwardRef<HTMLButtonElement, TechnicalButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, type = 'button', ...props }, ref) => {
    const variants = {
      primary: 'technical-button-primary',
      secondary: 'technical-button-secondary'
    }
    
    const sizes = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base'
    }
    
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          variants[variant],
          sizes[size],
          "transition-all duration-300 ease-in-out",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TechnicalButton.displayName = "TechnicalButton"

export { TechnicalButton } 