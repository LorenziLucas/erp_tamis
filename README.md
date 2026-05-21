# Gestão de Lotes — Sistema de Análise Pericial TRT

Sistema interno para controle de lotes de análise pericial trabalhista. Desenvolvido com React + TypeScript + Vite + Tailwind CSS.

## Stack

- **React 18** + **TypeScript** — componentes estritamente tipados
- **Vite 8** + **Tailwind CSS v4** — build rápido, tema escuro
- **Zustand** + `persist` middleware — estado global com persistência em `localStorage`
- **react-hook-form** + **zod** — formulários com validação em runtime e compiletime
- **SheetJS (xlsx)** — leitura e escrita de arquivos Excel sem servidor
- **Chart.js** + **react-chartjs-2** — gráficos interativos no dashboard
- **React Router v6** — navegação SPA

## Início rápido

```bash
cd gestao-lotes
npm install
npm run dev        # abre em http://localhost:5173
```

## Estrutura de arquivos

```
src/
├── types/
│   └── index.ts              # Interface Lote + constantes (TRTs, analistas, mapeamentos)
├── store/
│   └── lotesStore.ts         # Zustand store + seletores derivados (KPIs, ranking, tendência)
├── lib/
│   ├── utils.ts              # Formatadores de data/moeda, diffDays, groupBy
│   └── excelUtils.ts         # parseXlsx (preview), importXlsx (batch), exportToXlsx, downloadTemplate
├── components/
│   ├── ui/
│   │   ├── Badge.tsx         # TipoBadge, FormatoBadge, PagoBadge
│   │   ├── Button.tsx        # Variantes: primary, secondary, ghost, danger
│   │   ├── Card.tsx          # Card, KpiCard
│   │   ├── Input.tsx         # Input, Select, FormField (com label + erro)
│   │   ├── Modal.tsx         # Modal + ConfirmDialog
│   │   ├── Toast.tsx         # ToastProvider + useToast (success/error/warning)
│   │   └── EmptyState.tsx    # Estado vazio com ícone e CTA
│   ├── layout/
│   │   ├── Sidebar.tsx       # Navegação lateral com NavLink ativo
│   │   └── Layout.tsx        # Wrapper com Sidebar + Outlet
│   └── dashboard/
│       └── ChartCard.tsx     # Container de gráfico com título/subtítulo
├── pages/
│   ├── Dashboard.tsx         # KPIs, 4 gráficos, tabela de lotes recentes
│   └── lotes/
│       ├── LoteForm.tsx      # Formulário react-hook-form + zod (create/edit)
│       ├── NovoLotePage.tsx  # /lotes/novo
│       ├── LotesPage.tsx     # /lotes — tabela com filtros, ordenação, paginação
│       └── ImportarPage.tsx  # /lotes/importar — drag-and-drop XLS
├── App.tsx                   # Rotas + ToastProvider
├── main.tsx
└── index.css                 # Tailwind v4 + reset de scrollbar
```

## Módulo de importação XLS

### Como usar

1. Acesse **Importar XLS** no menu lateral
2. Arraste seu arquivo `.xlsx` ou clique para selecionar
3. Confira a pré-visualização com as primeiras 5 linhas e o contador de registros
4. Clique em **Importar** para adicionar ao sistema
5. Use o botão **Baixar Modelo** para obter um template com as colunas corretas

### Colunas esperadas (cabeçalhos da planilha)

| Coluna | Campo | Tipo |
|--------|-------|------|
| `REGIÃO` | regiao | Texto — ex: `TRT4 (RS)` |
| `PERITO` | perito | Texto — nome completo |
| `LOTE` | lote | Número |
| `ANALISTA` | analista | Texto |
| `QTD ANALISADA` | qtdAnalisada | Número |
| `ANÁLISE` | analise | `1ª` ou `2ª` |
| `TIPO` | tipo | `PJE`, `MISTO` ou `FÍSICO` |
| `FORMATO` | formato | `NOVO` ou `REVISÃO` |
| `ENVIO` | envio | Data ou serial Excel |
| `ENTREGA` | entrega | Data ou serial Excel |
| `MÊS REF.` | mesRef | Data ou serial Excel |
| `QTD DIAS` | qtdDias | Número (calculado se omitido) |
| `VALOR DEVIDO` | valorDevido | Número (R$) |
| `PAGO` | pago | `TRUE`, `FALSE`, `Sim`, `Não` |
| `QTD TOTAL` | qtdTotal | Número |
| `QTD DE "P"` | qtdP | Número |
| `TOTAL SENTENÇAS` | totalSentencas | Número |

### Conversão de datas Excel

Datas armazenadas como serial do Excel são convertidas automaticamente:
```ts
new Date(Math.round((serial - 25569) * 86400 * 1000))
```

## Dashboard

O dashboard é alimentado diretamente pelo store Zustand e atualiza em tempo real conforme lotes são adicionados, editados ou removidos.

**KPIs:** Total de lotes · Valor total · Valor pago · Processos analisados · Prazo médio · Peritos ativos

**Gráficos:**
- Tendência mensal (barras + linha dual-eixo: lotes e valor)
- Top 10 peritos por valor (horizontal)
- Distribuição por tipo PJE/MISTO/FÍSICO (donut)
- Distribuição por região (donut)

## Persistência

Todos os dados ficam em `localStorage` com a chave `gestao-lotes-store`. Para limpar, execute no console do browser:
```js
localStorage.removeItem('gestao-lotes-store')
```

## Build para produção

```bash
npm run build   # gera dist/
npm run preview # serve o build localmente
```
