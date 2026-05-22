import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('p-5 flex flex-col', className)}>
      <h3 className="text-sm font-semibold text-[#1A1A1A] shrink-0">{title}</h3>
      {subtitle
        ? <p className="text-xs text-[#5A6A5E] mt-0.5 mb-3 shrink-0">{subtitle}</p>
        : <div className="mb-3 shrink-0" />}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </Card>
  )
}
