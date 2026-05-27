import { useEffect, useState } from 'react'
import { Search, Plus, Pencil, Users, Building2 } from 'lucide-react'
import { usePeritosStore } from '../../store/peritosStore'
import { Button } from '../../components/ui/Button'
import { Input, FormField } from '../../components/ui/Input'
import { cn } from '../../lib/utils'
import type { PeritoCadastro, TRT } from '../../types'

// ── Formulário de cadastro/edição ─────────────────────────────────────────────

interface FormState {
  nome: string
  trtIds: string[]
}

interface PeritosFormProps {
  trts: TRT[]
  loading: boolean
  initial?: PeritoCadastro
  onSave: (nome: string, trtIds: string[]) => Promise<void>
  onCancel: () => void
}

function PeritosForm({ trts, loading, initial, onSave, onCancel }: PeritosFormProps) {
  const [form, setForm] = useState<FormState>({
    nome:   initial?.nome ?? '',
    trtIds: initial?.trtsVinculados.map((t) => t.id) ?? [],
  })
  const [erroNome, setErroNome] = useState('')
  const [erroTRT,  setErroTRT]  = useState('')

  function toggleTRT(id: string) {
    setForm((f) => ({
      ...f,
      trtIds: f.trtIds.includes(id) ? f.trtIds.filter((t) => t !== id) : [...f.trtIds, id],
    }))
    setErroTRT('')
  }

  async function handleSave() {
    let valid = true
    if (!form.nome.trim()) { setErroNome('Nome obrigatório'); valid = false }
    if (!form.trtIds.length) { setErroTRT('Selecione ao menos 1 TRT'); valid = false }
    if (!valid) return
    await onSave(form.nome.trim(), form.trtIds)
  }

  return (
    <div className="bg-white border border-[#D4DAD6] rounded-xl p-6 space-y-5 max-w-xl">
      <h2 className="text-base font-semibold text-[#1A1A1A]">
        {initial ? 'Editar Perito' : 'Novo Perito'}
      </h2>

      <FormField label="Nome" required error={erroNome}>
        <Input
          value={form.nome}
          onChange={(e) => { setForm((f) => ({ ...f, nome: e.target.value })); setErroNome('') }}
          placeholder="Nome completo do perito"
          autoFocus
        />
      </FormField>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-[#5A6A5E] uppercase tracking-wide">
          TRTs Vinculados <span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {trts.map((trt) => {
            const selected = form.trtIds.includes(trt.id)
            return (
              <button
                key={trt.id}
                type="button"
                onClick={() => toggleTRT(trt.id)}
                className={cn(
                  'rounded-md border py-2 px-3 text-sm font-medium transition-colors text-left',
                  selected
                    ? 'bg-[#1B4D2E] text-white border-[#1B4D2E]'
                    : 'bg-white text-[#5A6A5E] border-[#D4DAD6] hover:border-[#1B4D2E] hover:text-[#1B4D2E]',
                )}
              >
                <div className="font-semibold">TRT{trt.numero}</div>
                <div className="text-[11px] opacity-75">{trt.cidadeSede}</div>
              </button>
            )
          })}
        </div>
        {erroTRT && <p className="text-xs text-red-500">{erroTRT}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#D4DAD6]">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="button" variant="primary" disabled={loading} onClick={handleSave}>
          {loading ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PeritosPage() {
  const { trts, peritos, loading, fetchTRTs, fetchPeritos, createPerito, updatePerito } = usePeritosStore()

  const [query,   setQuery]   = useState('')
  const [filtroTRT, setFiltroTRT] = useState('')
  const [editando, setEditando] = useState<PeritoCadastro | null | 'novo'>(null)

  useEffect(() => {
    fetchTRTs()
    fetchPeritos()
  }, [fetchTRTs, fetchPeritos])

  const filtrados = peritos.filter((p) => {
    const matchNome = !query || p.nome.toLowerCase().includes(query.toLowerCase())
    const matchTRT  = !filtroTRT || p.trtsVinculados.some((t) => t.id === filtroTRT)
    return matchNome && matchTRT
  })

  const multiTRT = peritos.filter((p) => p.trtsVinculados.length > 1).length

  async function handleSave(nome: string, trtIds: string[]) {
    if (editando === 'novo') {
      await createPerito(nome, trtIds)
    } else if (editando) {
      await updatePerito(editando.id, nome, trtIds)
    }
    setEditando(null)
  }

  if (editando !== null) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <PeritosForm
          trts={trts}
          loading={loading}
          initial={editando === 'novo' ? undefined : editando}
          onSave={handleSave}
          onCancel={() => setEditando(null)}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">Peritos</h1>
          <p className="text-sm text-[#5A6A5E] mt-0.5">Cadastro e vínculos com TRTs</p>
        </div>
        <Button variant="primary" onClick={() => setEditando('novo')}>
          <Plus size={14} /> Novo Perito
        </Button>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users,     label: 'Total de Peritos',    value: peritos.length },
          { icon: Building2, label: 'TRTs Cadastrados',    value: trts.length },
          { icon: Users,     label: 'Com múltiplos TRTs',  value: multiTRT },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white border border-[#D4DAD6] rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F4F6F4] flex items-center justify-center shrink-0">
              <Icon size={16} className="text-[#1B4D2E]" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#1A1A1A]">{value}</div>
              <div className="text-xs text-[#5A6A5E]">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9AA4A0]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome…"
            className="w-full h-8 pl-8 pr-3 text-sm bg-white border border-[#D4DAD6] rounded-md text-[#1A1A1A] placeholder-[#9AA4A0] focus:outline-none focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30"
          />
        </div>
        <select
          value={filtroTRT}
          onChange={(e) => setFiltroTRT(e.target.value)}
          className="h-8 px-3 text-sm bg-white border border-[#D4DAD6] rounded-md text-[#1A1A1A] focus:outline-none focus:border-[#1B4D2E] focus:ring-1 focus:ring-[#1B4D2E]/30 cursor-pointer"
        >
          <option value="">Todos os TRTs</option>
          {trts.map((t) => (
            <option key={t.id} value={t.id}>TRT{t.numero} — {t.cidadeSede}</option>
          ))}
        </select>
      </div>

      {/* ── Lista ─────────────────────────────────────────────────────────── */}
      {loading && !peritos.length ? (
        <p className="text-sm text-[#5A6A5E]">Carregando…</p>
      ) : !filtrados.length ? (
        <div className="bg-white border border-[#D4DAD6] rounded-xl p-10 text-center">
          <p className="text-[#9AA4A0] text-sm">Nenhum perito encontrado.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#D4DAD6] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F6F4] border-b border-[#D4DAD6]">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">Perito</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">TRTs Vinculados</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F6F4]">
              {filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-[#F4F6F4]/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1A1A1A]">{p.nome}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.trtsVinculados.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1B4D2E]/10 text-[#1B4D2E]"
                        >
                          TRT{t.numero} · {t.cidadeSede}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditando(p)}
                      className="p-1.5 rounded-md text-[#5A6A5E] hover:text-[#1B4D2E] hover:bg-[#1B4D2E]/10 transition-colors"
                      title="Editar perito"
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-[#D4DAD6] text-xs text-[#9AA4A0]">
            {filtrados.length} perito{filtrados.length !== 1 ? 's' : ''}
            {(query || filtroTRT) && ` de ${peritos.length} no total`}
          </div>
        </div>
      )}
    </div>
  )
}
