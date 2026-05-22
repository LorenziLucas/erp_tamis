-- ============================================================
-- 001_initial_schema.sql
-- Schema inicial do ERP Tamis — Gestão de Lotes Periciais
-- Execute este arquivo no Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Extensões ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Função auxiliar: atualiza updated_at automaticamente ─────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TABELA: lotes
-- Representa cada lote de análise pericial enviado ao TRT.
-- ============================================================
create table if not exists public.lotes (
  -- Identidade
  id              uuid primary key default uuid_generate_v4(),

  -- Relacionamento com o usuário dono do registro
  user_id         uuid not null references auth.users(id) on delete cascade,

  -- Dados do lote
  trt             text        not null,                          -- ex: TRT_1, TRT_4
  regiao          text        not null,                          -- ex: TRT1 (RJ)
  perito          text        not null,
  lote            integer     not null,
  analista        text        not null,
  qtd_analisada   integer     not null default 0,
  analise         text        not null check (analise in ('1ª','2ª')),
  tipo            text        not null check (tipo in ('PJE','MISTO','FÍSICO')),
  formato         text        not null check (formato in ('NOVO','REVISÃO')),

  -- Datas (armazenadas como texto ISO: YYYY-MM-DD)
  envio           text        not null,
  entrega         text        not null default '',
  mes_ref         text        not null,                          -- YYYY-MM-01
  qtd_dias        integer     not null default 0,

  -- Financeiro
  valor_devido    numeric(12,2) not null default 0,
  pago            boolean     not null default false,

  -- Métricas adicionais
  qtd_total       integer     not null default 0,
  qtd_p           integer     not null default 0,
  total_sentencas numeric(12,2) not null default 0,

  -- Auditoria
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Índices para buscas frequentes
create index if not exists lotes_user_id_idx    on public.lotes (user_id);
create index if not exists lotes_mes_ref_idx    on public.lotes (mes_ref);
create index if not exists lotes_perito_idx     on public.lotes (perito);
create index if not exists lotes_pago_idx       on public.lotes (pago);
create index if not exists lotes_envio_idx      on public.lotes (envio desc);

-- Trigger para manter updated_at
create trigger lotes_updated_at
  before update on public.lotes
  for each row execute function update_updated_at();

-- ── Row Level Security ────────────────────────────────────────
alter table public.lotes enable row level security;

-- Política: usuário vê apenas seus próprios lotes
create policy "lotes: select próprios"
  on public.lotes for select
  using (auth.uid() = user_id);

-- Política: usuário insere apenas para si mesmo
create policy "lotes: insert próprios"
  on public.lotes for insert
  with check (auth.uid() = user_id);

-- Política: usuário atualiza apenas seus próprios lotes
create policy "lotes: update próprios"
  on public.lotes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Política: usuário deleta apenas seus próprios lotes
create policy "lotes: delete próprios"
  on public.lotes for delete
  using (auth.uid() = user_id);

-- ============================================================
-- COMENTÁRIOS para documentação do schema
-- ============================================================
comment on table  public.lotes                is 'Lotes de análise pericial por TRT';
comment on column public.lotes.trt            is 'Código do TRT: TRT_1, TRT_4, TRT_6, TRT_12';
comment on column public.lotes.regiao         is 'Label da região ex: TRT1 (RJ)';
comment on column public.lotes.perito         is 'Nome completo do perito responsável';
comment on column public.lotes.lote           is 'Número sequencial do lote dentro do perito/região';
comment on column public.lotes.analista       is 'Nome do analista interno responsável';
comment on column public.lotes.qtd_analisada  is 'Quantidade de processos analisados no lote';
comment on column public.lotes.analise        is '1ª ou 2ª análise';
comment on column public.lotes.tipo           is 'PJE | MISTO | FÍSICO';
comment on column public.lotes.formato        is 'NOVO | REVISÃO';
comment on column public.lotes.envio          is 'Data de envio ao perito (YYYY-MM-DD)';
comment on column public.lotes.entrega        is 'Data de entrega pelo perito (YYYY-MM-DD)';
comment on column public.lotes.mes_ref        is 'Mês de referência normalizado para YYYY-MM-01';
comment on column public.lotes.qtd_dias       is 'Dias entre envio e entrega (0 se não entregue)';
comment on column public.lotes.valor_devido   is 'Valor a pagar pelo lote (R$)';
comment on column public.lotes.pago           is 'true = pagamento efetuado';
comment on column public.lotes.qtd_total      is 'Total de processos no lote (antes do filtro)';
comment on column public.lotes.qtd_p          is 'Quantidade de processos tipo "P" (prioritários)';
comment on column public.lotes.total_sentencas is 'Total de sentenças no lote';
comment on column public.lotes.user_id        is 'FK para auth.users — dono do registro';
