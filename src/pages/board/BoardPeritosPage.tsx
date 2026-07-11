import { useEffect } from 'react'
import { useBoardPeritosStore } from '../../store/boardPeritosStore'

export default function BoardPeritosPage() {
  const { items, fetchBoard } = useBoardPeritosStore()

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1A1A1A]">Gestão de Peritos</h1>
        <p className="text-sm text-[#5A6A5E] mt-0.5">
          {items.length} perito{items.length !== 1 ? 's' : ''} carregado{items.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
