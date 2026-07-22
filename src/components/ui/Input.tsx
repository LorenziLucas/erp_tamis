import { cn } from '../../lib/utils'
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'

const fieldBase = 'bg-white border border-[#D4DAD6] rounded-md text-[#1A1A1A] text-sm placeholder-[#9AA4A0] focus:outline-none focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30 transition-colors w-full disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: string; containerClassName?: string }>(
  ({ className, error, containerClassName, ...props }, ref) => (
    <div className={containerClassName ?? 'w-full'}>
      <input
        ref={ref}
        {...props}
        className={cn(fieldBase, 'h-8 px-3', error && 'border-red-400 focus:border-red-500 focus:ring-red-500/30', className)}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { error?: string; containerClassName?: string }>(
  ({ className, error, containerClassName, children, ...props }, ref) => (
    <div className={containerClassName ?? 'w-full'}>
      <select
        ref={ref}
        {...props}
        className={cn(fieldBase, 'h-8 px-3 cursor-pointer', error && 'border-red-400', className)}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string; containerClassName?: string }>(
  ({ className, error, containerClassName, ...props }, ref) => (
    <div className={containerClassName ?? 'w-full'}>
      <textarea
        ref={ref}
        {...props}
        className={cn(fieldBase, 'px-3 py-2 resize-none', error && 'border-red-400', className)}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'

export function FormField({ label, error, required, children }: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[#5A6A5E] uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
