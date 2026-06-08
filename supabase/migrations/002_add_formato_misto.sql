-- Adiciona 'MISTO' como opção válida para o campo formato
alter table public.lotes
  drop constraint if exists lotes_formato_check;

alter table public.lotes
  add constraint lotes_formato_check check (formato in ('NOVO','REVISÃO','MISTO'));

comment on column public.lotes.formato is 'NOVO | REVISÃO | MISTO';
