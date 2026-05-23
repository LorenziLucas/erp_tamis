import { useEffect } from 'react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ExternalLink } from 'lucide-react'
import { Input, Select, FormField } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { TRT_OPTIONS } from '../../types'
import { TIPO_COBRANCA_OPTIONS, NOTA_FISCAL_OPTIONS } from '../../types/cobrancas'
import type { Cobranca, Perito } from '../../types/cobrancas'

const schema = z.object({
  perito:          z.string().min(2, 'Perito obrigatório'),
  cpfPerito:       z.string(),
  regiao:          z.string().min(1, 'Região obrigatória'),
  mesRef:          z.string(),
  dataEnvio:       z.string(),
  valor:           z.number().min(0, 'Valor deve ser >= 0'),
  tipo:            z.enum(['Comissão', 'Lote']),
  recebido:        z.boolean(),
  dataRecebimento: z.string(),
  notaFiscal:      z.enum(['Emitida', 'Não Emitida']),
  linkPdf:         z.string(),
})

export type CobrancaFormData = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<Cobranca>
  peritoNames: string[]
  peritos: Perito[]
  onSubmit: (data: CobrancaFormData) => void
  onCancel: () => void
  loading?: boolean
  submitLabel?: string
}

export function CobrancaForm({ defaultValues, peritoNames, peritos, onSubmit, onCancel, loading, submitLabel = 'Salvar' }: Props) {
  const cpfMap = Object.fromEntries(peritos.map((p) => [p.nome, p.cpf ?? '']))

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CobrancaFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      perito:          defaultValues?.perito          ?? '',
      cpfPerito:       defaultValues?.cpfPerito       ?? '',
      regiao:          defaultValues?.regiao          ?? '',
      mesRef:          defaultValues?.mesRef          ? defaultValues.mesRef.substring(0, 7) : '',
      dataEnvio:       defaultValues?.dataEnvio       ?? '',
      valor:           defaultValues?.valor           ?? 0,
      tipo:            defaultValues?.tipo            ?? 'Lote',
      recebido:        defaultValues?.recebido        ?? false,
      dataRecebimento: defaultValues?.dataRecebimento ?? '',
      notaFiscal:      defaultValues?.notaFiscal      ?? 'Não Emitida',
      linkPdf:         defaultValues?.linkPdf         ?? '',
    },
  })

  const peritoVal  = watch('perito')
  const recebido   = watch('recebido')
  const linkPdf    = watch('linkPdf')

  useEffect(() => {
    if (peritoVal && cpfMap[peritoVal] !== undefined) {
      setValue('cpfPerito', cpfMap[peritoVal])
    }
  }, [peritoVal, cpfMap, setValue])

  const handleValid: SubmitHandler<CobrancaFormData> = (data) => {
    // Normaliza mesRef para YYYY-MM-01
    const mesRef = data.mesRef ? `${data.mesRef}-01` : ''
    onSubmit({ ...data, mesRef })
  }

  return (
    <form onSubmit={handleSubmit(handleValid)} className="space-y-5">

      {/* Row 1: Perito + CPF */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Perito" required error={errors.perito?.message}>
          {peritoNames.length > 0 ? (
            <Controller
              name="perito"
              control={control}
              render={({ field }) => (
                <Select {...field} error={errors.perito?.message}>
                  <option value="">Selecione…</option>
                  {peritoNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              )}
            />
          ) : (
            <Input {...register('perito')} placeholder="Nome do perito" error={errors.perito?.message} />
          )}
        </FormField>

        <FormField label="CPF do Perito">
          <Input
            {...register('cpfPerito')}
            placeholder="000.000.000-00"
            className={cpfMap[peritoVal] ? 'opacity-70' : ''}
          />
          {cpfMap[peritoVal] && (
            <p className="mt-1 text-[11px] text-[#1B4D2E]/70">⚡ Preenchido automaticamente do cadastro</p>
          )}
        </FormField>
      </div>

      {/* Row 2: Região + Mês Ref */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Região" required error={errors.regiao?.message}>
          <Controller
            name="regiao"
            control={control}
            render={({ field }) => (
              <Select {...field} error={errors.regiao?.message}>
                <option value="">Selecione…</option>
                {TRT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.label}>{o.label}</option>
                ))}
              </Select>
            )}
          />
        </FormField>

        <FormField label="Mês de Referência">
          <Input {...register('mesRef')} type="month" />
        </FormField>
      </div>

      {/* Row 3: Data Envio + Valor + Tipo */}
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Data do Envio">
          <Input {...register('dataEnvio')} type="date" />
        </FormField>

        <FormField label="Valor (R$)" required error={errors.valor?.message}>
          <Input
            {...register('valor', { valueAsNumber: true })}
            type="number"
            step="0.01"
            min={0}
            error={errors.valor?.message}
          />
        </FormField>

        <FormField label="Tipo" required>
          <Controller
            name="tipo"
            control={control}
            render={({ field }) => (
              <Select {...field}>
                {TIPO_COBRANCA_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            )}
          />
        </FormField>
      </div>

      {/* Row 4: Recebido + Data Recebimento + Nota Fiscal */}
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Foi Recebido?">
          <div className="flex items-center gap-2 h-8">
            <input
              {...register('recebido')}
              type="checkbox"
              id="recebido"
              className="w-4 h-4 rounded border-[#D4DAD6] accent-[#1B4D2E]"
            />
            <label htmlFor="recebido" className="text-sm text-[#5A6A5E]">Sim</label>
          </div>
        </FormField>

        <FormField label="Data do Recebimento">
          <Input
            {...register('dataRecebimento')}
            type="date"
            disabled={!recebido}
            className={!recebido ? 'opacity-40 cursor-not-allowed' : ''}
          />
        </FormField>

        <FormField label="Nota Fiscal">
          <Controller
            name="notaFiscal"
            control={control}
            render={({ field }) => (
              <Select {...field}>
                {NOTA_FISCAL_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            )}
          />
        </FormField>
      </div>

      {/* Row 5: Link PDF */}
      <FormField label="Link do PDF (OneDrive)">
        <div className="flex gap-2">
          <Input {...register('linkPdf')} placeholder="Cole aqui o link do OneDrive…" />
          {linkPdf && (
            <a
              href={linkPdf}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-[#1B4D2E] border border-[#1B4D2E]/40 rounded-md hover:bg-[#1B4D2E]/5 transition-colors"
            >
              <ExternalLink size={12} /> Abrir
            </a>
          )}
        </div>
      </FormField>

      {/* Ações */}
      <div className="flex justify-end gap-2 pt-2 border-t border-[#D4DAD6]">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
