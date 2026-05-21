import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LoteForm } from './LoteForm'
import type { LoteFormData } from './LoteForm'
import { useLotesStore } from '../../store/lotesStore'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'

export default function NovoLotePage() {
  const navigate = useNavigate()
  const addLote = useLotesStore((s) => s.addLote)
  const { success } = useToast()

  const handleSubmit = (data: LoteFormData & { regiao: string; qtdDias: number }) => {
    addLote(data)
    success('Lote cadastrado com sucesso!')
    navigate('/lotes')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-100">Novo Lote</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cadastre um novo lote de análise pericial</p>
        </div>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
        <LoteForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/lotes')}
          submitLabel="Cadastrar Lote"
        />
      </div>
    </div>
  )
}
