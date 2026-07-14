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
