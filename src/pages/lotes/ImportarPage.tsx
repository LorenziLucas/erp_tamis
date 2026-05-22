import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, ArrowLeft, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useLotesStore } from '../../store/lotesStore'
import { useToast } from '../../components/ui/Toast'
import { parseXlsx, importXlsx, downloadTemplate } from '../../lib/excelUtils'
import type { ImportPreview } from '../../lib/excelUtils'
import { cn } from '../../lib/utils'

type Stage = 'idle' | 'preview' | 'importing' | 'done'

export default function ImportarPage() {
  const navigate = useNavigate()
  const addLotes = useLotesStore((s) => s.addLotes)
  const { success, error: toastError } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const lotes = useLotesStore((s) => s.lotes)

  const [stage, setStage] = useState<Stage>('idle')
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [imported, setImported] = useState(0)
  const [duplicates, setDuplicates] = useState(0)
  const [importErrors, setImportErrors] = useState<string[]>([])

  const processFile = useCallback(async (f: File) => {
    setFile(f)
    const p = await parseXlsx(f)
    setPreview(p)
    setStage('preview')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) processFile(f)
    else toastError('Por favor, selecione um arquivo .xlsx ou .xls')
  }, [processFile, toastError])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }, [processFile])

  const handleImport = async () => {
    if (!file) return
    setStage('importing')
    const result = await importXlsx(file, lotes)   // passa base existente para deduplicação
    const { imported: importedCount, errors: saveErrors } = await addLotes(result.lotes)
    const allErrors = [...result.errors, ...saveErrors]
    setImported(importedCount)
    setDuplicates(result.duplicates)
    setImportErrors(allErrors)
    setStage('done')
    if (importedCount > 0) {
      const dupMsg = result.duplicates > 0 ? ` (${result.duplicates} duplicata(s) ignorada(s))` : ''
      success(`${importedCount} lote(s) importado(s) com sucesso!${dupMsg}`)
    } else if (result.duplicates > 0) {
      toastError(`Todos os ${result.duplicates} registro(s) já existem na base — nenhum importado.`)
    } else {
      toastError('Nenhum lote pôde ser importado. Verifique os erros abaixo.')
    }
  }

  const reset = () => {
    setStage('idle')
    setFile(null)
    setPreview(null)
    setImported(0)
    setDuplicates(0)
    setImportErrors([])
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /></Button>
        <div>
          <h1 className="text-xl font-bold text-gray-100">Importar Planilha XLS</h1>
          <p className="text-sm text-gray-500 mt-0.5">Importe lotes em massa a partir do arquivo Excel de gestão</p>
        </div>
        <div className="ml-auto">
          <Button variant="secondary" size="md" onClick={downloadTemplate}>
            <Download size={13} /> Baixar Modelo .xlsx
          </Button>
        </div>
      </div>

      {/* Step 1: Drop zone */}
      {stage === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all',
            dragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-[#30363d] hover:border-blue-500/50 hover:bg-[#161b22]'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
            dragging ? 'bg-blue-500/20' : 'bg-[#1c2333]'
          )}>
            <Upload size={28} className={dragging ? 'text-blue-400' : 'text-gray-600'} />
          </div>
          <h3 className="text-base font-semibold text-gray-200 mb-1">
            {dragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo Excel'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">ou clique para selecionar — .xlsx, .xls</p>
          <div className="text-xs text-gray-700 bg-[#1c2333] rounded-lg px-4 py-2 max-w-sm">
            Colunas esperadas: REGIÃO, PERITO, LOTE, ANALISTA, QTD ANALISADA, ANÁLISE, TIPO, FORMATO, ENVIO, ENTREGA, MÊS REF., VALOR DEVIDO, PAGO…
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {(stage === 'preview' || stage === 'importing') && preview && (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-3">
            <FileSpreadsheet size={20} className="text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200 truncate">{file?.name}</div>
              <div className="text-xs text-gray-600">{(file?.size ?? 0 / 1024).toFixed(0)} KB</div>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}><X size={13} /></Button>
          </div>

          {/* Stats */}
          <div className="flex gap-3 flex-wrap">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
              preview.total === 0
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-[#1c2333] border-[#30363d]'
            }`}>
              {preview.total === 0
                ? <AlertCircle size={14} className="text-amber-400" />
                : <CheckCircle size={14} className="text-emerald-400" />}
              <span className={`text-sm ${preview.total === 0 ? 'text-amber-300' : 'text-gray-300'}`}>
                {preview.total === 0 ? 'Nenhum registro encontrado' : `${preview.total} registros detectados`}
              </span>
            </div>
            {preview.errors.length > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="text-red-400" />
                <span className="text-sm text-red-400">{preview.errors.length} erro(s) de estrutura</span>
              </div>
            )}
          </div>

          {/* Errors */}
          {preview.errors.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-400 mb-2">Avisos estruturais</h4>
              <ul className="space-y-1">
                {preview.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-300/80 flex gap-2">
                    <span className="text-red-500">•</span> {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Pré-visualização (primeiras 5 linhas)</h3>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-[#30363d]">
                    {preview.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-gray-600 font-semibold bg-[#1c2333] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-b border-[#30363d] last:border-0 hover:bg-[#1c2333]">
                      {preview.headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-gray-400 whitespace-nowrap max-w-[120px] truncate">
                          {String(row[h] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={reset}>Cancelar</Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleImport}
              disabled={stage === 'importing' || preview.total === 0}
            >
              {stage === 'importing' ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importando…
                </>
              ) : (
                <><Upload size={14} /> Importar {preview.total} registro(s)</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {stage === 'done' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${imported > 0 ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
            <CheckCircle size={32} className={imported > 0 ? 'text-emerald-400' : 'text-amber-400'} />
          </div>
          <h2 className="text-xl font-bold text-gray-100 mb-1">Importação concluída</h2>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {imported > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full px-3 py-1">
                <CheckCircle size={11} /> {imported} importado{imported !== 1 ? 's' : ''}
              </span>
            )}
            {duplicates > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full px-3 py-1">
                ⊘ {duplicates} duplicata{duplicates !== 1 ? 's' : ''} ignorada{duplicates !== 1 ? 's' : ''}
              </span>
            )}
            {importErrors.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400 rounded-full px-3 py-1">
                <AlertCircle size={11} /> {importErrors.length} erro{importErrors.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {importErrors.length > 0 && (
            <div className="w-full bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-6 text-left">
              <h4 className="text-sm font-semibold text-red-400 mb-2">Erros durante a importação</h4>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {importErrors.map((e, i) => (
                  <li key={i} className="text-xs text-red-300/80">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={reset}>Importar outro arquivo</Button>
            <Button variant="primary" onClick={() => navigate('/lotes')}>Ver lotes importados</Button>
          </div>
        </div>
      )}
    </div>
  )
}
