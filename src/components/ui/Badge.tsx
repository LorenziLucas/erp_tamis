import { cn } from '../../lib/utils'

type Variant = 'blue' | 'orange' | 'green' | 'purple' | 'teal' | 'red' | 'gray'

const styles: Record<Variant, string> = {
  blue:   'bg-[#1B4D2E]/10 text-[#1B4D2E] ring-[#1B4D2E]/20',
  orange: 'bg-amber-100 text-amber-700 ring-amber-300/50',
  green:  'bg-emerald-100 text-emerald-700 ring-emerald-300/50',
  purple: 'bg-purple-100 text-purple-700 ring-purple-300/50',
  teal:   'bg-teal-100 text-teal-700 ring-teal-300/50',
  red:    'bg-red-100 text-red-700 ring-red-300/50',
  gray:   'bg-[#EEF1EE] text-[#5A6A5E] ring-[#D4DAD6]',
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
  const map: Record<string, Variant> = { NOVO: 'purple', 'REVISÃO': 'teal', MISTO: 'orange' }
  return <Badge variant={map[formato] ?? 'gray'}>{formato}</Badge>
}

export function PagoBadge({ pago }: { pago: boolean }) {
  return <Badge variant={pago ? 'green' : 'red'}>{pago ? 'Pago' : 'Pendente'}</Badge>
}
