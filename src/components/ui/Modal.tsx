import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../../lib/utils'

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-full', widths[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X size={14} /></Button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-400 mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={() => { onConfirm(); onClose() }}>Confirmar exclusão</Button>
      </div>
    </Modal>
  )
}
