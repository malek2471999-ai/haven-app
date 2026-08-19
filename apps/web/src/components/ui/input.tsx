'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="label-text"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            'input-field',
            error && 'input-error',
            className
          )}
          ref={ref}
          dir="ltr"
          {...props}
        />
        {error && <p className="error-text">{error}</p>}
        {hint && !error && <p className="text-xs text-dark-500 mt-1.5">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
