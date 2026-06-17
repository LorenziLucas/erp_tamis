import { useEffect, useState } from 'react'
import { Plus, Pencil, Building2, Users, MapPin } from 'lucide-react'
import { usePeritosStore } from '../../store/peritosStore'
import { Button } from '../../components/ui/Button'
import { Input, FormField } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import type { TRT } from '../../types'

// ── Formulário de cadastro/edição ─────────────────────────────────────────────

interface TRTFormState {
  numero: string
  cidadeSede: string
}

interface TRTsFormProps {
  loading:  boolean
  initial?: TRT
  numerosExistentes: number[]
  onSave:   (numero: number, cidadeSede: string) => Promise<void>
  onCancel: () => void
}

function TRTsForm({ loading, initial, numerosExistentes, onSave, onCancel }: TRTsFormProps) {
  const [form, setForm] = useState<TRTFormState>({
    numero:     initial ? String(initial.numero) : '',
    cidadeSede: initial?.cidadeSede ?? '',
  })
  const [erros, setErros] = useState<Partial<TRTFormState>>({})

  function validate(): boolean {
    const e: Partial<TRTFormState> = {}
    const n = Number(form.numero)
    if (!form.numero || isNaN(n) || n < 1) {
      e.numero = 'Número obrigatório e deve ser >= 1'
    } else if (!initial && numerosExistentes.includes(n)) {
      e.numero = `TRT${n} já cadastrado`
    } else if (initial && initial.numero !== n && numerosExistentes.includes(n)) {
      e.numero = `TRT${n} já cadastrado`
    }
    if (!form.cidadeSede.trim()) e.cidadeSede = 'Cidade sede obrigatória'
    setErros(e)
    return !Object.keys(e).length
  }

  async function handleSave() {
    if (!validate()) return
    await onSave(Number(form.numero), form.cidadeSede.trim())
  }

  return (
    <div className="bg-white border border-[#D4DAD6] rounded-xl p-6 space-y-5 max-w-md">
      <h2 className="text-base font-semibold text-[#1A1A1A]">
        {initial ? 'Editar TRT' : 'Novo TRT'}
      </h2>

      <FormField label="Número do TRT" required error={erros.numero}>
        <Input
          type="number"
          min={1}
          value={form.numero}
          onChange={(e) => { setForm((f) => ({ ...f, numero: e.target.value })); setErros((e) => ({ ...e, numero: undefined })) }}
          placeholder="Ex: 4"
          autoFocus
        />
        {form.numero && !isNaN(Number(form.numero)) && Number(form.numero) >= 1 && (
          <p className="mt-1 text-[11px] text-[#5A6A5E]">
            Descrição gerada: <span className="font-medium">{Number(form.numero)}ª Região</span>
          </p>
        )}
      </FormField>

      <FormField label="Cidade Sede" required error={erros.cidadeSede}>
        <Input
          value={form.cidadeSede}
          onChange={(e) => { setForm((f) => ({ ...f, cidadeSede: e.target.value })); setErros((e) => ({ ...e, cidadeSede: undefined })) }}
          placeholder="Ex: Porto Alegre"
        />
      </FormField>

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

export default function TRTsPage() {
  const { trts, peritos, loading, fetchTRTs, fetchPeritos, createTRT, updateTRT } = usePeritosStore()
  const { success, error: toastError } = useToast()

  const [editando, setEditando] = useState<TRT | null | 'novo'>(null)

  useEffect(() => {
    fetchTRTs()
    fetchPeritos()
  }, [fetchTRTs, fetchPeritos])

  function peritosPorTRT(trtId: string): number {
    return peritos.filter((p) => p.trtsVinculados.some((t) => t.id === trtId)).length
  }

  const numerosExistentes = trts.map((t) => t.numero)

  async function handleSave(numero: number, cidadeSede: string) {
    try {
      if (editando === 'novo') {
        await createTRT(numero, cidadeSede)
        success('TRT cadastrado com sucesso!')
      } else if (editando) {
        await updateTRT(editando.id, numero, cidadeSede)
        success('TRT atualizado com sucesso!')
      }
      setEditando(null)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar TRT')
    }
  }

  if (editando !== null) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <TRTsForm
          loading={loading}
          initial={editando === 'novo' ? undefined : editando}
          numerosExistentes={numerosExistentes}
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
          <h1 className="text-xl font-bold text-[#1A1A1A]">TRTs</h1>
          <p className="text-sm text-[#5A6A5E] mt-0.5">Tribunais Regionais do Trabalho cadastrados</p>
        </div>
        <Button variant="primary" onClick={() => setEditando('novo')}>
          <Plus size={14} /> Novo TRT
        </Button>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: Building2, label: 'TRTs Cadastrados', value: trts.length },
          { icon: Users,     label: 'Total de Peritos',  value: peritos.length },
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

      {/* ── Lista ─────────────────────────────────────────────────────────── */}
      {loading && !trts.length ? (
        <p className="text-sm text-[#5A6A5E]">Carregando…</p>
      ) : !trts.length ? (
        <div className="bg-white border border-[#D4DAD6] rounded-xl p-10 text-center">
          <p className="text-[#9AA4A0] text-sm">Nenhum TRT cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#D4DAD6] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F6F4] border-b border-[#D4DAD6]">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">TRT</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">Região</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">
                  <div className="flex items-center gap-1"><MapPin size={11} /> Cidade Sede</div>
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">
                  <div className="flex items-center gap-1"><Users size={11} /> Peritos</div>
                </th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F6F4]">
              {trts.map((trt) => {
                const qtd = peritosPorTRT(trt.id)
                return (
                  <tr key={trt.id} className="hover:bg-[#F4F6F4]/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold bg-[#1B4D2E] text-white">
                        TRT{trt.numero}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5A6A5E]">{trt.descricao}</td>
                    <td className="px-4 py-3 text-[#1A1A1A] font-medium">{trt.cidadeSede}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[#5A6A5E]">
                        <Users size={12} />
                        {qtd} perito{qtd !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditando(trt)}
                        className="p-1.5 rounded-md text-[#5A6A5E] hover:text-[#1B4D2E] hover:bg-[#1B4D2E]/10 transition-colors"
                        title="Editar TRT"
                      >
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-[#D4DAD6] text-xs text-[#9AA4A0]">
            {trts.length} TRT{trts.length !== 1 ? 's' : ''} cadastrado{trts.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
