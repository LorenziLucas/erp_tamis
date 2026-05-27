import { useEffect, useState } from 'react'
import { usePeritosStore } from '../store/peritosStore'
import { getPeritosByTRT } from '../services/peritosService'
import { TRT_OPTIONS } from '../types'
import { cn } from '../lib/utils'
import { Select, FormField } from './ui/Input'

interface PeritoCurto { id: string; nome: string }

interface Props {
  trtId: string
  peritoId: string
  onChangeTRT: (trtId: string, trt: string, regiao: string) => void
  onChangePerito: (peritoId: string, perito: string) => void
  erroTRT?: string
  erroPeito?: string
}

export function SeletorTRTPerito({ trtId, peritoId, onChangeTRT, onChangePerito, erroTRT, erroPeito }: Props) {
  const trts      = usePeritosStore((s) => s.trts)
  const fetchTRTs = usePeritosStore((s) => s.fetchTRTs)

  const [peritos,        setPeritos]        = useState<PeritoCurto[]>([])
  const [loadingPeritos, setLoadingPeritos] = useState(false)

  useEffect(() => {
    if (!trts.length) fetchTRTs()
  }, [trts.length, fetchTRTs])

  useEffect(() => {
    if (!trtId) { setPeritos([]); return }
    setLoadingPeritos(true)
    getPeritosByTRT(trtId).then(({ data }) => {
      setPeritos(data)
      setLoadingPeritos(false)
    })
  }, [trtId])

  function getLegacy(numero: number): { value: string; label: string } {
    const value = `TRT_${numero}`
    const opt   = TRT_OPTIONS.find((o) => o.value === value)
    return { value, label: opt?.label ?? value }
  }

  function cardLabel(numero: number, cidadeSede: string): string {
    const estado = cidadeSede.includes('Janeiro') ? 'RJ'
      : cidadeSede.includes('Alegre')  ? 'RS'
      : cidadeSede.includes('Recife')  ? 'PE'
      : cidadeSede.includes('polis')   ? 'SC'
      : cidadeSede.slice(0, 2).toUpperCase()
    return `TRT${numero} · ${estado}`
  }

  return (
    <div className="space-y-4">
      {/* ── TRT cards ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-[#5A6A5E] uppercase tracking-wide">
          TRT / Tribunal <span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {trts.map((trt) => {
            const legacy     = getLegacy(trt.numero)
            const isSelected = trtId === trt.id
            return (
              <button
                key={trt.id}
                type="button"
                onClick={() => onChangeTRT(trt.id, legacy.value, legacy.label)}
                className={cn(
                  'rounded-md border py-2 px-1 text-sm font-medium transition-colors text-center',
                  isSelected
                    ? 'bg-[#1B4D2E] text-white border-[#1B4D2E]'
                    : 'bg-white text-[#5A6A5E] border-[#D4DAD6] hover:border-[#1B4D2E] hover:text-[#1B4D2E]',
                )}
              >
                {cardLabel(trt.numero, trt.cidadeSede)}
              </button>
            )
          })}
          {!trts.length && (
            <p className="col-span-4 text-xs text-[#9AA4A0]">Carregando TRTs…</p>
          )}
        </div>
        {erroTRT && <p className="text-xs text-red-500">{erroTRT}</p>}
      </div>

      {/* ── Perito select ──────────────────────────────────────────────────── */}
      <FormField label="Perito" required error={erroPeito}>
        <Select
          value={peritoId}
          disabled={!trtId || loadingPeritos}
          onChange={(e) => {
            const sel = peritos.find((p) => p.id === e.target.value)
            if (sel) onChangePerito(sel.id, sel.nome)
          }}
        >
          <option value="">
            {!trtId
              ? 'Selecione um TRT primeiro…'
              : loadingPeritos
                ? 'Carregando peritos…'
                : 'Selecione o perito…'}
          </option>
          {peritos.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </Select>
      </FormField>
    </div>
  )
}
