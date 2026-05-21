import { useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { createContext, useContext } from 'react'

type ToastType = 'success' | 'error' | 'warning'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idCounter = useRef(0)

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = String(++idCounter.current)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  const success = useCallback((msg: string) => toast('success', msg), [toast])
  const error = useCallback((msg: string) => toast('error', msg), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const icons = { success: CheckCircle, error: XCircle, warning: AlertCircle }
  const colors = {
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    error:   'border-red-500/40 bg-red-500/10 text-red-400',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  }
  const Icon = icons[item.type]

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-xl',
        'text-sm font-medium max-w-sm backdrop-blur-sm',
        'transition-all duration-300',
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8',
        colors[item.type]
      )}
    >
      <Icon size={15} className="mt-0.5 shrink-0" />
      <span className="flex-1 text-gray-200">{item.message}</span>
      <button onClick={onClose} className="text-gray-500 hover:text-gray-300 ml-2">
        <X size={13} />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
