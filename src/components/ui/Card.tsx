import type { ElementType } from 'react'
import { cn } from '../../lib/utils'

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-[#161b22] border border-[#30363d] rounded-lg', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4 border-b border-[#30363d]', className)}>{children}</div>
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

const STRIPE: Record<string, string> = {
  blue:   'from-blue-500 to-blue-600',
  green:  'from-emerald-500 to-emerald-600',
  orange: 'from-amber-500 to-amber-600',
  purple: 'from-purple-500 to-purple-600',
  teal:   'from-teal-500 to-teal-600',
  red:    'from-red-500 to-red-600',
}
const TEXT: Record<string, string> = {
  blue:   'text-blue-400',
  green:  'text-emerald-400',
  orange: 'text-amber-400',
  purple: 'text-purple-400',
  teal:   'text-teal-400',
  red:    'text-red-400',
}
const ICON_BG: Record<string, string> = {
  blue:   'bg-blue-500/15',
  green:  'bg-emerald-500/15',
  orange: 'bg-amber-500/15',
  purple: 'bg-purple-500/15',
  teal:   'bg-teal-500/15',
  red:    'bg-red-500/15',
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
    <div className="relative bg-[#161b22] border border-[#30363d] rounded-lg p-5 overflow-hidden hover:border-blue-500/40 transition-colors">
      {/* Faixa de cor no topo */}
      <div className={cn('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r', STRIPE[color])} />

      {/* Ícone no canto superior direito */}
      {Icon && (
        <div className={cn('absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center', ICON_BG[color])}>
          <Icon size={17} className={TEXT[color]} />
        </div>
      )}

      {/* Conteúdo */}
      <div className={cn('text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2', Icon && 'pr-11')}>
        {label}
      </div>
      <div className={cn('text-3xl font-bold leading-tight', TEXT[color])}>{value}</div>
      {sub && <div className="mt-1.5 text-xs text-gray-600">{sub}</div>}
    </div>
  )
}
