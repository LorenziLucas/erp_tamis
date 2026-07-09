import { useEffect, useMemo } from 'react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ExternalLink } from 'lucide-react'
import { Input, Select, FormField } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { SeletorTRTPerito } from '../../components/SeletorTRTPerito'
import { REGIAO_MAP, TRT_OPTIONS } from '../../types'
import { NOTA_FISCAL_OPTIONS } from '../../types/cobrancas'
import { usePeritosStore } from '../../store/peritosStore'
import { getPeritosByTRT } from '../../services/peritosService'
import type { Cobranca, Perito } from '../../types/cobrancas'

// Schema com todos os campos possíveis (edição usa valor/tipo; criação usa
// comissao/lote/valorComissao/valorLote). Mantido único para dar um tipo
// estável ao react-hook-form — a validação condicional é aplicada por cima.
const baseSchema = z.object({
  trtId:           z.string().optional(),
  peritoId:        z.string().optional(),
  perito:          z.string().min(2, 'Perito obrigatório'),
  cpfPerito:       z.string(),
  regiao:          z.string().min(1, 'Região obrigatória'),
  mesRef:          z.string().min(1, 'Mês de referência obrigatório'),
  dataEnvio:       z.string(),
  valor:           z.number().min(0, 'Valor deve ser >= 0'),
  tipo:            z.enum(['Comissão', 'Lote']),
  comissao:        z.boolean(),
  lote:            z.boolean(),
  valorComissao:   z.number().min(0, 'Valor deve ser >= 0'),
  valorLote:       z.number().min(0, 'Valor deve ser >= 0'),
  recebido:        z.boolean(),
  dataRecebimento: z.string(),
  notaFiscal:      z.enum(['Emitida', 'Não Emitida']),
  linkPdf:         z.string(),
})

const createSchema = baseSchema.refine((data) => data.comissao || data.lote, {
  message: 'Selecione ao menos um tipo (Comissão ou Lote)',
  path: ['comissao'],
})

export type CobrancaFormData = z.infer<typeof baseSchema>

/** Payload pronto para persistir — 1 registro por tipo (Comissão/Lote). */
export type CobrancaSubmitData = {
  perito: string
  cpfPerito: string
  regiao: string
  mesRef: string
  dataEnvio: string
  valor: number
  tipo: 'Comissão' | 'Lote'
  recebido: boolean
  dataRecebimento: string
  notaFiscal: 'Emitida' | 'Não Emitida'
  linkPdf: string
}

/** Mês anterior ao atual, no formato YYYY-MM (compatível com <input type="month">). */
function getPreviousMonthValue(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Data de hoje no formato YYYY-MM-DD (compatível com <input type="date">). */
function getTodayValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

interface Props {
  defaultValues?: Partial<Cobranca>
  peritoNames: string[]
  peritos: Perito[]
  onSubmit: (data: CobrancaSubmitData[]) => void
  onCancel: () => void
  loading?: boolean
  submitLabel?: string
}

export function CobrancaForm({ defaultValues, peritos, onSubmit, onCancel, loading, submitLabel = 'Salvar' }: Props) {
  const cpfMap = Object.fromEntries(peritos.map((p) => [p.nome, p.cpf ?? '']))
  const isEdit = !!defaultValues

  const trts      = usePeritosStore((s) => s.trts)
  const fetchTRTs = usePeritosStore((s) => s.fetchTRTs)

  const schema = useMemo(() => (isEdit ? baseSchema : createSchema), [isEdit])

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
      trtId:           '',
      peritoId:        '',
      perito:          defaultValues?.perito          ?? '',
      cpfPerito:       defaultValues?.cpfPerito       ?? '',
      regiao:          defaultValues?.regiao          ?? '',
      mesRef:          isEdit
        ? (defaultValues?.mesRef ? defaultValues.mesRef.substring(0, 7) : '')
        : getPreviousMonthValue(),
      dataEnvio:       isEdit ? (defaultValues?.dataEnvio ?? '') : getTodayValue(),
      valor:           defaultValues?.valor           ?? 0,
      tipo:            defaultValues?.tipo            ?? 'Comissão',
      comissao:        !isEdit || defaultValues?.tipo === 'Comissão',
      lote:            isEdit && defaultValues?.tipo === 'Lote',
      valorComissao:   0,
      valorLote:       0,
      recebido:        defaultValues?.recebido        ?? false,
      dataRecebimento: defaultValues?.dataRecebimento ?? '',
      notaFiscal:      defaultValues?.notaFiscal      ?? 'Não Emitida',
      linkPdf:         defaultValues?.linkPdf         ?? '',
    },
  })

  const peritoVal = watch('perito')
  const recebido  = watch('recebido')
  const linkPdf   = watch('linkPdf')
  const comissaoVal = watch('comissao')
  const loteVal      = watch('lote')

  useEffect(() => {
    if (peritoVal && cpfMap[peritoVal] !== undefined) {
      setValue('cpfPerito', cpfMap[peritoVal])
    }
  }, [peritoVal, cpfMap, setValue])

  // Modo edição: resolve trtId/peritoId a partir de regiao/perito salvos
  useEffect(() => {
    if (!defaultValues?.regiao || !defaultValues?.perito) return
    if (!trts.length) { fetchTRTs(); return }

    const matchTRT = trts.find((t) => {
      const opt = TRT_OPTIONS.find((o) => o.value === `TRT_${t.numero}`)
      return opt?.label === defaultValues.regiao
    })
    if (!matchTRT) return

    setValue('trtId', matchTRT.id)

    getPeritosByTRT(matchTRT.id).then(({ data }) => {
      const found = data.find((p) => p.nome === defaultValues.perito)
      if (found) setValue('peritoId', found.id)
    })
  }, [defaultValues?.regiao, defaultValues?.perito, trts, fetchTRTs, setValue])

  const handleValid: SubmitHandler<CobrancaFormData> = (data) => {
    const mesRef = data.mesRef ? `${data.mesRef}-01` : ''
    const common = {
      perito:          data.perito,
      cpfPerito:       data.cpfPerito,
      regiao:          data.regiao,
      mesRef,
      dataEnvio:       data.dataEnvio,
      recebido:        data.recebido,
      dataRecebimento: data.dataRecebimento,
      notaFiscal:      data.notaFiscal,
      linkPdf:         data.linkPdf,
    }

    if (isEdit) {
      onSubmit([{ ...common, valor: data.valor, tipo: data.tipo }])
      return
    }

    const payloads: CobrancaSubmitData[] = []
    if (data.comissao) payloads.push({ ...common, valor: data.valorComissao, tipo: 'Comissão' })
    if (data.lote)     payloads.push({ ...common, valor: data.valorLote,     tipo: 'Lote' })
    onSubmit(payloads)
  }

  return (
    <form onSubmit={handleSubmit(handleValid)} className="space-y-5">

      {/* Região + Perito */}
      <SeletorTRTPerito
        trtId={watch('trtId') ?? ''}
        peritoId={watch('peritoId') ?? ''}
        onChangeTRT={(trtId, trt) => {
          setValue('trtId',    trtId,                 { shouldValidate: true, shouldDirty: true })
          setValue('regiao',   REGIAO_MAP[trt] ?? '', { shouldValidate: true, shouldDirty: true })
          setValue('peritoId', '',                    { shouldDirty: true })
          setValue('perito',   '',                    { shouldDirty: true })
        }}
        onChangePerito={(peritoId, perito) => {
          setValue('peritoId', peritoId, { shouldValidate: true, shouldDirty: true })
          setValue('perito',   perito,   { shouldValidate: true, shouldDirty: true })
        }}
        erroTRT={errors.regiao?.message}
        erroPeito={errors.perito?.message}
      />

      {/* CPF do Perito */}
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

      {/* Mês de Referência + Data do Envio */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Mês de Referência" required error={errors.mesRef?.message}>
          <Input {...register('mesRef')} type="month" error={errors.mesRef?.message} />
        </FormField>

        <FormField label="Data do Envio">
          <Input {...register('dataEnvio')} type="date" />
        </FormField>
      </div>

      {/* Valor + Tipo */}
      {isEdit ? (
        <div className="grid grid-cols-2 gap-4">
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
                <div className="flex items-center gap-6 h-8">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-[#D4DAD6] accent-[#1B4D2E]"
                      checked={field.value === 'Comissão'}
                      onChange={() => field.onChange('Comissão')}
                    />
                    <span className="text-sm text-[#5A6A5E]">Comissão</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-[#D4DAD6] accent-[#1B4D2E]"
                      checked={field.value === 'Lote'}
                      onChange={() => field.onChange('Lote')}
                    />
                    <span className="text-sm text-[#5A6A5E]">Lote</span>
                  </label>
                </div>
              )}
            />
          </FormField>
        </div>
      ) : (
        <div className="space-y-4">
          <FormField label="Tipo" required error={errors.comissao?.message}>
            <div className="flex items-center gap-6 h-8">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  {...register('comissao')}
                  type="checkbox"
                  className="w-4 h-4 rounded border-[#D4DAD6] accent-[#1B4D2E]"
                />
                <span className="text-sm text-[#5A6A5E]">Comissão</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  {...register('lote')}
                  type="checkbox"
                  className="w-4 h-4 rounded border-[#D4DAD6] accent-[#1B4D2E]"
                />
                <span className="text-sm text-[#5A6A5E]">Lote</span>
              </label>
            </div>
          </FormField>

          {(comissaoVal || loteVal) && (
            <div className={`grid gap-4 ${comissaoVal && loteVal ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {comissaoVal && (
                <FormField label="Valor Comissão (R$)" required error={errors.valorComissao?.message}>
                  <Input
                    {...register('valorComissao', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min={0}
                    error={errors.valorComissao?.message}
                  />
                </FormField>
              )}
              {loteVal && (
                <FormField label="Valor Lote (R$)" required error={errors.valorLote?.message}>
                  <Input
                    {...register('valorLote', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min={0}
                    error={errors.valorLote?.message}
                  />
                </FormField>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recebido + Data Recebimento + Nota Fiscal */}
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

      {/* Link PDF */}
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
