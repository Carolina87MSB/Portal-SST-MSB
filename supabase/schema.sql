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
