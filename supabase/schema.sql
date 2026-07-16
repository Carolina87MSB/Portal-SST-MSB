-- Portal SST MSB — schema da tabela de colaboradores no Supabase.
--
-- Rode este arquivo inteiro em Supabase Dashboard > SQL Editor > New query.
-- Ele é seguro para rodar mais de uma vez (usa IF NOT EXISTS / OR REPLACE).
--
-- Por que só "colaboradores" está aqui: é a única tabela que guarda dado
-- pessoal sensível (CPF, nome, exames de saúde) do repositório público. As
-- demais listas (catálogo de EPI, matriz por função, matriz ocupacional)
-- continuam como JSON estático em src/data/ — não têm dado de colaborador e
-- não precisam de controle de acesso.

create table if not exists public.colaboradores (
  id bigint primary key,
  cpf text not null,
  nome text not null,
  cargo text not null default '',
  departamento text not null default '',
  epis jsonb not null default '[]'::jsonb,
  exames jsonb not null default '[]'::jsonb,
  origem text not null default '',
  nascimento date,
  updated_at timestamptz not null default now()
);

comment on table public.colaboradores is
  'Base unificada EPI + ASO. Dado pessoal sensível (LGPD) — acesso restrito por RLS a usuários autenticados.';
comment on column public.colaboradores.epis is 'Lista de nomes de EPI (string[]).';
comment on column public.colaboradores.exames is 'Lista de { proc, ultimo, proximo, status } — ver ExameRegistro em src/types/domain.ts.';

-- Row Level Security: só usuários autenticados no Supabase Auth conseguem
-- LER a tabela. Ninguém (nem autenticado) pode INSERT/UPDATE/DELETE pela API
-- pública — a carga de dados é feita só pelo script de seed com a service
-- role key (que ignora RLS), rodado localmente pela equipe de RH/dados.
alter table public.colaboradores enable row level security;

drop policy if exists "authenticated_can_read_colaboradores" on public.colaboradores;
create policy "authenticated_can_read_colaboradores"
  on public.colaboradores
  for select
  to authenticated
  using (true);

-- Desligamento — campos usados também pelo Portal PeopleFlow (mesmo projeto
-- Supabase, mesma tabela `colaboradores`). Colunas novas, todas opcionais;
-- não afetam nenhuma leitura/policy existente.
--
-- Diferente do resto da tabela (carregada só pelo script de seed local com a
-- service_role key), o desligamento é gravado a partir do próprio app: a ação
-- "Desligar colaborador" chama a Vercel Serverless Function em
-- api/desligar-colaborador.ts, que usa a service_role key no servidor — a
-- policy de RLS abaixo continua sem permitir UPDATE via API pública.
alter table public.colaboradores
  add column if not exists desligado boolean not null default false,
  add column if not exists data_desligamento date,
  add column if not exists motivo_desligamento text,
  add column if not exists desligado_by text;

comment on column public.colaboradores.desligado is 'true quando o colaborador foi desligado (ver api/desligar-colaborador.ts).';
comment on column public.colaboradores.data_desligamento is 'Data do desligamento.';
comment on column public.colaboradores.motivo_desligamento is 'Motivo informado no momento do desligamento.';
comment on column public.colaboradores.desligado_by is 'E-mail do usuário RH que registrou o desligamento.';

-- Anexos de exame ocupacional (ASO) e fichas de entrega de EPI — Storage real
-- no Supabase. Antes, o arquivo virava base64 e ficava só no localStorage do
-- navegador (nunca saía dali, sem backup, sem visibilidade entre RH/dispositivos)
-- — ver AnexarExameModal.tsx e FichaEpiControls.tsx. As entregas/fichas de EPI
-- em si também eram só locais (nunca existiram no Supabase); passam a ser a
-- fonte da verdade aqui, com os arquivos anexados no bucket abaixo.

-- 1) Bucket de Storage — privado (leitura só via signed URL, nunca pública).
insert into storage.buckets (id, name, public)
values ('anexos-sst', 'anexos-sst', false)
on conflict (id) do nothing;

drop policy if exists "authenticated_upload_anexos_sst" on storage.objects;
create policy "authenticated_upload_anexos_sst"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos-sst');

drop policy if exists "authenticated_read_anexos_sst" on storage.objects;
create policy "authenticated_read_anexos_sst"
  on storage.objects for select to authenticated
  using (bucket_id = 'anexos-sst');

-- 2) Anexos de exame ocupacional — log histórico de cada exame anexado
-- (equivalente ao antigo state.attachments, agora persistido).
create table if not exists public.sst_anexos_exames (
  id text primary key,
  colab_id bigint not null references public.colaboradores(id),
  proc text not null,
  data_iso text not null default '',
  fornecedor text not null default '',
  valor numeric not null default 0,
  file_name text not null default '',
  storage_path text,
  ts text not null default '',
  responsavel text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.sst_anexos_exames is
  'Log de exames ASO anexados (documento no bucket anexos-sst) — ver AttachmentExame em src/types/domain.ts.';

alter table public.sst_anexos_exames enable row level security;
drop policy if exists "authenticated_full_access_anexos_exames" on public.sst_anexos_exames;
create policy "authenticated_full_access_anexos_exames"
  on public.sst_anexos_exames for all
  to authenticated
  using (true)
  with check (true);

-- 3) Entregas de EPI — uma linha por item entregue, nunca sobrescrita
-- (mesma regra de "histórico imutável" que já existia local).
create table if not exists public.sst_entregas_epi (
  id text primary key,
  colab_id bigint not null references public.colaboradores(id),
  cpf text not null default '',
  epi text not null,
  qtd integer not null default 1,
  ca text not null default '',
  fornecedor text not null default '',
  valor_unit numeric not null default 0,
  data_entrega text not null default '',
  data_troca text not null default '',
  obs text not null default '',
  responsavel text not null default '',
  assinatura text not null default '',
  ficha_id text,
  ts text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.sst_entregas_epi is
  'Entregas de EPI registradas pelo RH — ver EntregaEpi em src/types/domain.ts.';

alter table public.sst_entregas_epi enable row level security;
drop policy if exists "authenticated_full_access_entregas_epi" on public.sst_entregas_epi;
create policy "authenticated_full_access_entregas_epi"
  on public.sst_entregas_epi for all
  to authenticated
  using (true)
  with check (true);

-- 4) Fichas de entrega de EPI (PDF) — agrupam entregas num lote assinável,
-- com a via assinada anexada depois pelo RH.
create table if not exists public.sst_fichas_epi (
  id text primary key,
  numero integer not null,
  colab_id bigint not null references public.colaboradores(id),
  entrega_ids text[] not null default '{}',
  gerada_em text not null default '',
  gerada_por text not null default '',
  assinatura_file_name text,
  assinatura_mime text,
  assinatura_storage_path text,
  assinatura_anexada_em text,
  assinatura_responsavel text,
  created_at timestamptz not null default now()
);

comment on table public.sst_fichas_epi is
  'Fichas de entrega de EPI e a via assinada anexada — ver FichaEntregaEpi em src/types/domain.ts.';

alter table public.sst_fichas_epi enable row level security;
drop policy if exists "authenticated_full_access_fichas_epi" on public.sst_fichas_epi;
create policy "authenticated_full_access_fichas_epi"
  on public.sst_fichas_epi for all
  to authenticated
  using (true)
  with check (true);
