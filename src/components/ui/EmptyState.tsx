import { FileX2 } from 'lucide-react'

export function EmptyState({
  title = 'Nenhum dado encontrado',
  description,
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#1c2333] border border-[#30363d] mb-4">
        <FileX2 size={28} className="text-gray-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-600 max-w-sm mb-5">{description}</p>}
      {action}
    </div>
  )
}
