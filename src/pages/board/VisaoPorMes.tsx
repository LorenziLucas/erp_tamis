import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight as ArrowRight } from 'lucide-react'
import { useBoardLotesStore } from '../../store/boardLotesStore'
import { useToast } from '../../components/ui/Toast'
import { regionBadgeClasses, ProgressBar } from './BoardPeritosPage'
import type { BoardPerito, BoardLote } from '../../types/board'
import { cn } from '../../lib/utils'

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatMesExtenso(mesKey: string): string {
  const [ano, mes] = mesKey.split('-')
  const label = MESES_PT[Number(mes) - 1] ?? mes
  return `${label} ${ano}`
}

interface LoteComPerito {
  perito: BoardPerito
  lote: BoardLote
}

export default function VisaoPorMes({
  peritos,
  mesAlvo,
}: {
  peritos: BoardPerito[]
  mesAlvo: string | null
}) {
  const lotesByPerito = useBoardLotesStore((s) => s.lotesByPerito)
  const updateLote = useBoardLotesStore((s) => s.updateLote)
  const { success, error: toastError } = useToast()

  const [collapsedMeses, setCollapsedMeses] = useState<Set<string>>(new Set())

  const grupos = useMemo(() => {
    const porMes = new Map<string, LoteComPerito[]>()

    peritos.forEach((perito) => {
      const lotes = lotesByPerito[perito.id] ?? []
      lotes.forEach((lote) => {
        const chave = lote.mesRef ? lote.mesRef.slice(0, 7) : 'sem-mes'
        if (mesAlvo && chave !== mesAlvo) return
        const lista = porMes.get(chave) ?? []
        lista.push({ perito, lote })
        porMes.set(chave, lista)
      })
    })

    const chaves = Array.from(porMes.keys()).filter((k) => k !== 'sem-mes').sort()
    if (porMes.has('sem-mes')) chaves.push('sem-mes')

    return chaves.map((chave) => ({
      chave,
      label: chave === 'sem-mes' ? 'Sem mês definido' : formatMesExtenso(chave),
      itens: (porMes.get(chave) ?? []).slice().sort((a, b) =>
        a.perito.nome.localeCompare(b.perito.nome) || a.lote.numero - b.lote.numero,
      ),
    }))
  }, [peritos, lotesByPerito, mesAlvo])

  async function handleToggle(item: LoteComPerito) {
    try {
      await updateLote(item.perito.id, item.lote.id, { entregue: !item.lote.entregue })
      success('Checklist atualizado')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao atualizar item')
    }
  }

  function toggleMes(chave: string) {
    setCollapsedMeses((prev) => {
      const next = new Set(prev)
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      return next
    })
  }

  if (grupos.length === 0) {
    return (
      <div className="bg-white border border-[#D4DAD6] rounded-xl p-10 text-center">
        <p className="text-[#9AA4A0] text-sm">Nenhum lote provisionado encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {grupos.map((grupo) => {
        const total = grupo.itens.length
        const entregues = grupo.itens.filter((i) => i.lote.entregue).length
        const pendentes = total - entregues
        const collapsed = collapsedMeses.has(grupo.chave)

        return (
          <div key={grupo.chave} className="bg-white border border-[#D4DAD6] rounded-xl overflow-hidden">
            <button
              onClick={() => toggleMes(grupo.chave)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F4F6F4] transition-colors"
            >
              <span className="text-sm font-semibold text-[#1A1A1A]">{grupo.label}</span>
              <span className="text-xs text-[#5A6A5E]">{entregues} entregues · {pendentes} pendentes</span>
              <ProgressBar entregue={entregues} total={total} />
              <span className="flex-1" />
              {collapsed ? <ArrowRight size={14} className="text-[#9AA4A0]" /> : <ChevronDown size={14} className="text-[#9AA4A0]" />}
            </button>

            {!collapsed && (
              <div>
                {grupo.itens.map(({ perito, lote }) => (
                  <div
                    key={lote.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-t border-[#EEF1EE] first:border-t-0"
                  >
                    <input
                      type="checkbox"
                      checked={lote.entregue}
                      onChange={() => handleToggle({ perito, lote })}
                      className="w-4 h-4 accent-[#1B4D2E] shrink-0 cursor-pointer"
                    />
                    <span className={cn(
                      'text-sm font-medium w-48 truncate shrink-0',
                      lote.entregue ? 'text-[#5A6A5E] line-through' : 'text-[#1A1A1A]',
                    )}>
                      {perito.nome}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0', regionBadgeClasses(perito.regiao))}>
                      {perito.regiao}
                    </span>
                    <span className="text-xs text-[#5A6A5E] flex-1 truncate">
                      {lote.numero}º LOTE · {lote.tipo ?? '—'} - {lote.formato ?? '—'}
                    </span>
                    <span className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                      lote.entregue ? 'bg-[#E8F5EE] text-[#1B4D2E]' : 'bg-amber-50 text-amber-700',
                    )}>
                      {lote.entregue ? 'Entregue' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
