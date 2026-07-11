import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, UserCog, Mail } from 'lucide-react'
import { useAnalistasStore } from '../../store/analistasStore'
import { Button } from '../../components/ui/Button'
import { Input, FormField } from '../../components/ui/Input'
import { ConfirmDialog } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import type { Analista } from '../../types/analista'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Formulário de cadastro/edição ─────────────────────────────────────────────

interface AnalistaFormState {
  nome:  string
  email: string
}

interface AnalistasFormProps {
  loading:  boolean
  initial?: Analista
  onSave:   (nome: string, email: string | null) => Promise<void>
  onCancel: () => void
}

function AnalistasForm({ loading, initial, onSave, onCancel }: AnalistasFormProps) {
  const [form, setForm] = useState<AnalistaFormState>({
    nome:  initial?.nome ?? '',
    email: initial?.email ?? '',
  })
  const [erros, setErros] = useState<Partial<AnalistaFormState>>({})

  function validate(): boolean {
    const e: Partial<AnalistaFormState> = {}
    if (!form.nome.trim()) e.nome = 'Nome obrigatório'
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) e.email = 'E-mail inválido'
    setErros(e)
    return !Object.keys(e).length
  }

  async function handleSave() {
    if (!validate()) return
    await onSave(form.nome.trim(), form.email.trim() || null)
  }

  return (
    <div className="bg-white border border-[#D4DAD6] rounded-xl p-6 space-y-5 max-w-md">
      <h2 className="text-base font-semibold text-[#1A1A1A]">
        {initial ? 'Editar analista' : 'Novo analista'}
      </h2>

      <FormField label="Nome" required error={erros.nome}>
        <Input
          value={form.nome}
          onChange={(e) => { setForm((f) => ({ ...f, nome: e.target.value })); setErros((e) => ({ ...e, nome: undefined })) }}
          placeholder="Ex: Mabel Pilla"
          autoFocus
        />
      </FormField>

      <FormField label="E-mail" error={erros.email}>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setErros((e) => ({ ...e, email: undefined })) }}
          placeholder="Ex: mabel@exemplo.com"
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

export default function AnalistasPage() {
  const { analistas, loading, fetchAnalistas, createAnalista, updateAnalista, deleteAnalista } = useAnalistasStore()
  const { success, error: toastError } = useToast()

  const [editando, setEditando] = useState<Analista | null | 'novo'>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalistas()
  }, [fetchAnalistas])

  async function handleSave(nome: string, email: string | null) {
    try {
      if (editando === 'novo') {
        await createAnalista(nome, email)
        success('Analista cadastrado com sucesso!')
      } else if (editando) {
        await updateAnalista(editando.id, nome, email)
        success('Analista atualizado com sucesso!')
      }
      setEditando(null)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao salvar analista')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAnalista(id)
      success('Analista excluído.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Erro ao excluir analista')
    } finally {
      setDeleteId(null)
    }
  }

  if (editando !== null) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <AnalistasForm
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
          <h1 className="text-xl font-bold text-[#1A1A1A]">Analistas</h1>
          <p className="text-sm text-[#5A6A5E] mt-0.5">Analistas cadastrados</p>
        </div>
        <Button variant="primary" onClick={() => setEditando('novo')}>
          <Plus size={14} /> Novo analista
        </Button>
      </div>

      {/* ── KPI ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#D4DAD6] rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F4F6F4] flex items-center justify-center shrink-0">
            <UserCog size={16} className="text-[#1B4D2E]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#1A1A1A]">{analistas.length}</div>
            <div className="text-xs text-[#5A6A5E]">Analistas Cadastrados</div>
          </div>
        </div>
      </div>

      {/* ── Lista ─────────────────────────────────────────────────────────── */}
      {loading && !analistas.length ? (
        <p className="text-sm text-[#5A6A5E]">Carregando…</p>
      ) : !analistas.length ? (
        <div className="bg-white border border-[#D4DAD6] rounded-xl p-10 text-center">
          <p className="text-[#9AA4A0] text-sm">Nenhum analista cadastrado.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#D4DAD6] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F6F4] border-b border-[#D4DAD6]">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5A6A5E] uppercase tracking-wide">
                  <div className="flex items-center gap-1"><Mail size={11} /> E-mail</div>
                </th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F6F4]">
              {analistas.map((analista) => (
                <tr key={analista.id} className="hover:bg-[#F4F6F4]/50 transition-colors">
                  <td className="px-4 py-3 text-[#1A1A1A] font-medium">{analista.nome}</td>
                  <td className="px-4 py-3 text-[#5A6A5E]">{analista.email ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditando(analista)}
                        className="p-1.5 rounded-md text-[#5A6A5E] hover:text-[#1B4D2E] hover:bg-[#1B4D2E]/10 transition-colors"
                        title="Editar analista"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteId(analista.id)}
                        className="p-1.5 rounded-md text-[#5A6A5E] hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir analista"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-[#D4DAD6] text-xs text-[#9AA4A0]">
            {analistas.length} analista{analistas.length !== 1 ? 's' : ''} cadastrado{analistas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Excluir analista"
        message="Tem certeza que deseja excluir este analista? Esta ação não pode ser desfeita."
      />
    </div>
  )
}
