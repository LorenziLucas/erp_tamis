import { useEffect, useState } from 'react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, FormField } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { TRT_OPTIONS, REGIAO_MAP, ANALISTA_OPTIONS, TIPO_OPTIONS, FORMATO_OPTIONS, ANALISE_OPTIONS } from '../../types'
import { calcDias } from '../../lib/utils'
import { useLotesStore } from '../../store/lotesStore'
import type { Lote } from '../../types'

function computeValorDevido(analista: string, formato: string, qtdAnalisada: number): number | null {
  const first = analista.trim().split(' ')[0].toLowerCase()
  if (first === 'rodrigo') return 0
  if (first === 'matheus') return Math.round(qtdAnalisada * 1.5 * 100) / 100
  if (first === 'mabel')   return Math.round(qtdAnalisada * 1.5 * 100) / 100
  if (first === 'renatha') {
    const mult = formato === 'REVISÃO' ? 1.5 : 2
    return Math.round(qtdAnalisada * mult * 100) / 100
  }
  return null
}

function valorFormulaLabel(analista: string, formato: string, qtdAnalisada: number): string {
  const first = analista.trim().split(' ')[0]
  const fl    = first.toLowerCase()
  const f2 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  if (fl === 'rodrigo') return `${first}: valor fixo R$ 0,00`
  if (fl === 'matheus') return `${first}: ${qtdAnalisada} × R$ 1,50 = R$ ${f2(qtdAnalisada * 1.5)}`
  if (fl === 'mabel')   return `${first}: ${qtdAnalisada} × R$ 1,50 = R$ ${f2(qtdAnalisada * 1.5)}`
  if (fl === 'renatha') {
    const mult = formato === 'REVISÃO' ? 1.5 : 2
    return `${first} (${formato}): ${qtdAnalisada} × R$ ${f2(mult)} = R$ ${f2(qtdAnalisada * mult)}`
  }
  return ''
}

const schema = z.object({
  trt:           z.string().min(1, 'Selecione o TRT'),
  perito:        z.string().min(2, 'Nome do perito obrigatório'),
  lote:          z.number().min(1, 'Lote deve ser >= 1'),
  analista:      z.string().min(1, 'Selecione o analista'),
  qtdAnalisada:  z.number().min(1, 'Qtd deve ser >= 1'),
  analise:       z.enum(['1ª', '2ª']),
  tipo:          z.enum(['PJE', 'MISTO', 'FÍSICO']),
  formato:       z.enum(['NOVO', 'REVISÃO']),
  envio:         z.string().min(1, 'Data de envio obrigatória'),
  entrega:       z.string(),
  mesRef:        z.string(),
  valorDevido:   z.number().min(0),
  pago:          z.boolean(),
  qtdTotal:      z.number().min(0),
  qtdP:          z.number().min(0),
  totalSentencas: z.number().min(0),
})

export type LoteFormData = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<Lote>
  onSubmit: (data: LoteFormData & { regiao: string; qtdDias: number }) => void
  onCancel?: () => void
  submitLabel?: string
  loading?: boolean
}

export function LoteForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Salvar', loading }: Props) {
  const lotesNoStore      = useLotesStore((s) => s.lotes)
  const peritosExistentes = [...new Set(lotesNoStore.map((l) => l.perito))].sort()

  const [peritoMode, setPeritoMode] = useState<'select' | 'new'>(
    defaultValues?.perito ? 'new' : 'select'
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<LoteFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      trt:           defaultValues?.trt           ?? '',
      perito:        defaultValues?.perito         ?? '',
      lote:          defaultValues?.lote           ?? 1,
      analista:      defaultValues?.analista       ?? '',
      qtdAnalisada:  defaultValues?.qtdAnalisada   ?? 0,
      analise:       defaultValues?.analise        ?? '1ª',
      tipo:          defaultValues?.tipo           ?? 'PJE',
      formato:       defaultValues?.formato        ?? 'NOVO',
      envio:         defaultValues?.envio          ?? '',
      entrega:       defaultValues?.entrega        ?? '',
      mesRef:        defaultValues?.mesRef         ?? '',
      valorDevido:   defaultValues?.valorDevido    ?? 0,
      pago:          defaultValues?.pago           ?? false,
      qtdTotal:      defaultValues?.qtdTotal       ?? 0,
      qtdP:          defaultValues?.qtdP           ?? 0,
      totalSentencas: defaultValues?.totalSentencas ?? 0,
    },
  })

  const envio        = watch('envio')
  const entrega      = watch('entrega')
  const analista     = watch('analista')
  const formato      = watch('formato')
  const qtdAnalisada = watch('qtdAnalisada')

  const qtdDias = calcDias(envio, entrega)

  useEffect(() => {
    const base = entrega || envio
    setValue('mesRef', base ? base.substring(0, 7) + '-01' : '')
  }, [envio, entrega, setValue])

  useEffect(() => {
    const computed = computeValorDevido(analista, formato, qtdAnalisada)
    if (computed !== null) setValue('valorDevido', computed)
  }, [analista, formato, qtdAnalisada, setValue])

  const isValorAuto = computeValorDevido(analista, formato, qtdAnalisada) !== null

  function mesRefLabel(): string {
    const base = entrega || envio
    if (!base) return ''
    const [year, month] = base.split('-')
    return new Date(Number(year), Number(month) - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  const handleValid: SubmitHandler<LoteFormData> = (data) => {
    const regiao  = REGIAO_MAP[data.trt] ?? data.trt
    const base    = data.entrega || data.envio
    const mesRef  = base ? base.substring(0, 7) + '-01' : ''
    onSubmit({ ...data, mesRef, regiao, qtdDias })
  }

  return (
    <form onSubmit={handleSubmit(handleValid)} className="space-y-5">

      {/* Row 1: TRT + Perito */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="TRT / Tribunal" required error={errors.trt?.message}>
          <Controller
            name="trt"
            control={control}
            render={({ field }) => (
              <Select {...field} error={errors.trt?.message}>
                <option value="">Selecione…</option>
                {TRT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            )}
          />
        </FormField>

        <FormField label="Perito" required error={errors.perito?.message}>
          {peritoMode === 'select' && peritosExistentes.length > 0 ? (
            <div className="flex gap-1.5">
              <Controller
                name="perito"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => {
                      if (e.target.value === '__novo__') {
                        setPeritoMode('new'); field.onChange('')
                      } else {
                        field.onChange(e.target.value)
                      }
                    }}
                    error={errors.perito?.message}
                  >
                    <option value="">Selecione um perito…</option>
                    {peritosExistentes.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="__novo__">+ Novo perito (digitar nome)</option>
                  </Select>
                )}
              />
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Input
                {...register('perito')}
                placeholder="Nome completo do perito"
                error={errors.perito?.message}
                autoFocus={peritoMode === 'new'}
              />
              {peritosExistentes.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setPeritoMode('select'); setValue('perito', '') }}
                  className="shrink-0 h-8 px-2 text-xs text-[#5A6A5E] hover:text-[#1A1A1A] bg-white border border-[#D4DAD6] rounded-md transition-colors whitespace-nowrap"
                >
                  ← Lista
                </button>
              )}
            </div>
          )}
        </FormField>
      </div>

      {/* Row 2: Lote + Analista */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Número do Lote" required error={errors.lote?.message}>
          <Input {...register('lote', { valueAsNumber: true })} type="number" min={1} error={errors.lote?.message} />
        </FormField>
        <FormField label="Analista" required error={errors.analista?.message}>
          <Controller
            name="analista"
            control={control}
            render={({ field }) => (
              <Select {...field} error={errors.analista?.message}>
                <option value="">Selecione…</option>
                {ANALISTA_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            )}
          />
        </FormField>
      </div>

      {/* Row 3: Tipo + Formato + Análise */}
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Tipo" required error={errors.tipo?.message}>
          <Controller name="tipo" control={control}
            render={({ field }) => (
              <Select {...field}>{TIPO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
            )}
          />
        </FormField>
        <FormField label="Formato" required error={errors.formato?.message}>
          <Controller name="formato" control={control}
            render={({ field }) => (
              <Select {...field}>{FORMATO_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}</Select>
            )}
          />
        </FormField>
        <FormField label="Análise" required>
          <Controller name="analise" control={control}
            render={({ field }) => (
              <Select {...field}>{ANALISE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}</Select>
            )}
          />
        </FormField>
      </div>

      {/* Row 4: Datas */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Data de Envio" required error={errors.envio?.message}>
          <Input {...register('envio')} type="date" error={errors.envio?.message} />
        </FormField>
        <FormField label="Data de Entrega">
          <Input {...register('entrega')} type="date" />
        </FormField>
      </div>

      {/* Info automática */}
      {envio && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#5A6A5E] -mt-2 px-0.5">
          {entrega && (
            <span>
              Prazo:{' '}
              <span className="text-[#2D7A47] font-semibold">{qtdDias} dia{qtdDias !== 1 ? 's' : ''}</span>
              {envio === entrega && (
                <span className="ml-1.5 text-amber-600/80">(mesmo dia → contado como 1)</span>
              )}
            </span>
          )}
          <span>
            Mês de referência:{' '}
            <span className="text-[#1A1A1A] font-medium capitalize">{mesRefLabel()}</span>
            {!entrega && (
              <span className="ml-1.5 text-[#9AA4A0]">← atualizará ao preencher entrega</span>
            )}
          </span>
        </div>
      )}

      {/* Row 5: Quantidades */}
      <div className="grid grid-cols-4 gap-4">
        <FormField label="Qtd Analisada" required error={errors.qtdAnalisada?.message}>
          <Input {...register('qtdAnalisada', { valueAsNumber: true })} type="number" min={0} error={errors.qtdAnalisada?.message} />
        </FormField>
        <FormField label="Qtd Total" error={errors.qtdTotal?.message}>
          <Input {...register('qtdTotal', { valueAsNumber: true })} type="number" min={0} />
        </FormField>
        <FormField label='Qtd "P"' error={errors.qtdP?.message}>
          <Input {...register('qtdP', { valueAsNumber: true })} type="number" min={0} />
        </FormField>
        <FormField label="Total Sentenças (R$)" error={errors.totalSentencas?.message}>
          <Input {...register('totalSentencas', { valueAsNumber: true })} type="number" step="0.01" min={0} />
        </FormField>
      </div>

      {/* Row 6: Financeiro */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Valor Investido (R$)" required error={errors.valorDevido?.message}>
          <Input
            {...register('valorDevido', { valueAsNumber: true })}
            type="number"
            step="0.01"
            min={0}
            readOnly={isValorAuto}
            className={isValorAuto ? 'cursor-not-allowed opacity-60' : ''}
            error={errors.valorDevido?.message}
          />
          {isValorAuto && analista && (
            <p className="mt-1 text-[11px] text-[#1B4D2E]/70 leading-snug">
              ⚡ {valorFormulaLabel(analista, formato, qtdAnalisada)}
            </p>
          )}
        </FormField>

        <FormField label="Status de Pagamento">
          <div className="flex items-center gap-2 h-8">
            <input
              {...register('pago')}
              type="checkbox"
              id="pago"
              className="w-4 h-4 rounded border-[#D4DAD6] bg-white accent-[#1B4D2E]"
            />
            <label htmlFor="pago" className="text-sm text-[#5A6A5E]">Marcado como pago</label>
          </div>
        </FormField>
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-2 pt-2 border-t border-[#D4DAD6]">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        )}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
