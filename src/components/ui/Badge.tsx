import { cn } from '../../lib/utils'

type Variant = 'blue' | 'orange' | 'green' | 'purple' | 'teal' | 'red' | 'gray'

const styles: Record<Variant, string> = {
  blue:   'bg-blue-500/15 text-blue-400 ring-blue-500/20',
  orange: 'bg-amber-500/15 text-amber-400 ring-amber-500/20',
  green:  'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
  purple: 'bg-purple-500/15 text-purple-400 ring-purple-500/20',
  teal:   'bg-teal-500/15 text-teal-400 ring-teal-500/20',
  red:    'bg-red-500/15 text-red-400 ring-red-500/20',
  gray:   'bg-gray-500/15 text-gray-400 ring-gray-500/20',
}

export function Badge({ children, variant = 'gray', className }: {
  children: React.ReactNode
  variant?: Variant
  className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      styles[variant],
      className
    )}>
      {children}
    </span>
  )
}

export function TipoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, Variant> = { PJE: 'blue', MISTO: 'orange', 'FÍSICO': 'green' }
  return <Badge variant={map[tipo] ?? 'gray'}>{tipo}</Badge>
}

export function FormatoBadge({ formato }: { formato: string }) {
  return <Badge variant={formato === 'REVISÃO' ? 'teal' : 'purple'}>{formato}</Badge>
}

export function PagoBadge({ pago }: { pago: boolean }) {
  return <Badge variant={pago ? 'green' : 'red'}>{pago ? 'Pago' : 'Pendente'}</Badge>
}
