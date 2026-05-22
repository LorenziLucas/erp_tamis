import type { ElementType } from 'react'
import { cn } from '../../lib/utils'

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-[#D4DAD6] rounded-lg', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4 border-b border-[#D4DAD6]', className)}>{children}</div>
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

const STRIPE: Record<string, string> = {
  blue:   'from-[#1B4D2E] to-[#2D7A47]',
  green:  'from-emerald-500 to-emerald-600',
  orange: 'from-amber-500 to-amber-600',
  purple: 'from-purple-500 to-purple-600',
  teal:   'from-teal-500 to-teal-600',
  red:    'from-red-500 to-red-600',
}
const TEXT: Record<string, string> = {
  blue:   'text-[#1B4D2E]',
  green:  'text-emerald-600',
  orange: 'text-amber-600',
  purple: 'text-purple-600',
  teal:   'text-teal-600',
  red:    'text-red-600',
}
const ICON_BG: Record<string, string> = {
  blue:   'bg-[#1B4D2E]/10',
  green:  'bg-emerald-50',
  orange: 'bg-amber-50',
  purple: 'bg-purple-50',
  teal:   'bg-teal-50',
  red:    'bg-red-50',
}

export function KpiCard({
  label,
  value,
  sub,
  color = 'blue',
  icon: Icon,
}: {
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red'
  icon?: ElementType
}) {
  return (
    <div className="relative bg-white border border-[#D4DAD6] rounded-lg p-5 overflow-hidden hover:border-[#1B4D2E]/40 transition-colors">
      <div className={cn('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r', STRIPE[color])} />

      {Icon && (
        <div className={cn('absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center', ICON_BG[color])}>
          <Icon size={17} className={TEXT[color]} />
        </div>
      )}

      <div className={cn('text-xs font-semibold text-[#5A6A5E] uppercase tracking-wider mb-2', Icon && 'pr-11')}>
        {label}
      </div>
      <div className={cn('text-3xl font-bold leading-tight', TEXT[color])}>{value}</div>
      {sub && <div className="mt-1.5 text-xs text-[#7A8A7E]">{sub}</div>}
    </div>
  )
}
