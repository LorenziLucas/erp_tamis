import { cn } from '../../lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantStyles: Record<Variant, string> = {
  primary:   'bg-blue-600 hover:bg-blue-500 text-white border-transparent',
  secondary: 'bg-[#1c2333] hover:bg-[#21262d] text-gray-200 border-[#30363d]',
  ghost:     'bg-transparent hover:bg-[#21262d] text-gray-400 hover:text-gray-200 border-transparent',
  danger:    'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/30',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center rounded-md border font-medium',
        'transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </button>
  )
}
