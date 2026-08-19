import * as React from 'react'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from './loading'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'danger'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-haven-500/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          {
            'bg-gradient-to-br from-haven-500 to-haven-600 text-white shadow-lg shadow-haven-500/20 hover:shadow-xl hover:shadow-haven-500/30 hover:-translate-y-0.5': variant === 'default',
            'border border-dark-700/50 bg-dark-800/50 text-dark-100 hover:bg-dark-700/50 hover:border-dark-600/50': variant === 'outline',
            'text-dark-300 hover:text-dark-100 hover:bg-dark-800/50': variant === 'ghost',
            'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20': variant === 'danger',
          },
          {
            'h-10 px-4 py-2 text-sm': size === 'default',
            'h-8 px-3 text-xs': size === 'sm',
            'h-12 px-6 text-base': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <LoadingSpinner className="ml-2" size="sm" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
