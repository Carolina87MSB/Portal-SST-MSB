# Portal SST · MSB

Portal interno de RH/SST (Segurança e Saúde do Trabalho) da MSB — gestão de EPI e controle de Exames Ocupacionais (ASO), com base unificada de colaboradores e a matriz ocupacional (PCMSO + PGR).

Reconstruído a partir de um protótipo visual (pasta `Portal SST MSB.zip`, modelo "Moderno · Dashboard") como uma aplicação real em **React + TypeScript + Vite**, com **Supabase** como backend (autenticação + base de colaboradores) e deploy previsto na **Vercel**.

## Como rodar localmente

Pré-requisito: [Node.js](https://nodejs.org) 20+.

1. **Crie um projeto no Supabase** (gratuito) em [supabase.com](https://supabase.com/dashboard) — leva ~3 minutos.
2. **Rode o schema**: abra _SQL Editor_ no painel do projeto, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e execute. Isso cria a tabela `colaboradores` com RLS (só usuários autenticados leem).
3. **Crie as contas do RH**: em _Authentication → Users → Add user_, crie uma entrada para cada e-mail autorizado (ex. `carolina.cruz@msbbrasil.com`, `leslie.souza@msbbrasil.com`). Não é preciso senha — o login é por link mágico (magic link) enviado ao e-mail. **Não há autocadastro**: só quem tem conta criada aqui consegue entrar.
4. **Configure a URL de redirecionamento** do magic link em _Authentication → URL Configuration_: adicione `http://localhost:5173` (dev) e, depois do deploy, a URL da Vercel.
5. **Copie as chaves**: em _Settings → API_, pegue a `Project URL`, a `Publishable key` (antigo nome: "anon public") e a `Secret key` (antigo nome: "service_role").
6. **Configure o ambiente local**:
   ```bash
   cd portal-sst
   cp .env.example .env.local
   # edite .env.local com os 3 valores do passo 5
   npm install
   ```
7. **Carregue a base de colaboradores real** (o arquivo `src/data/colaboradores.json` com os dados reais fica só na sua máquina, nunca no git — veja "Dados e privacidade" abaixo). Com esse arquivo presente:
   ```bash
   npm run seed:supabase
   ```
8. **Rode o app**:
   ```bash
   npm run dev    # http://localhost:5173
   npm run build  # build de produção em dist/
   npm run lint   # oxlint
   ```

Sem um `.env.local` preenchido, o app sobe normalmente mas mostra a tela de login com um aviso de que o Supabase não está configurado (ver `src/lib/supabaseClient.ts`).

## Deploy na Vercel

1. Importe o repositório `Carolina87MSB/Portal-SST-MSB` na Vercel (framework detectado automaticamente: Vite).
2. Em _Settings → Environment Variables_, adicione:
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (os mesmos valores do `.env.local`). **Atenção ao prefixo**: como o projeto é Vite (não Next.js), as variáveis precisam começar com `VITE_` — `NEXT_PUBLIC_...` não é lido pelo app e o build fica com o Supabase "não configurado" mesmo depois do deploy.
   - `SUPABASE_SERVICE_ROLE_KEY` — **sem** prefixo `VITE_` (fica só no servidor, nunca chega ao navegador). Antes só era usada localmente por `npm run seed:supabase`; agora também é usada pela Vercel Serverless Function em `api/desligar-colaborador.ts` para gravar o desligamento (a RLS da tabela `colaboradores` continua sem liberar UPDATE para a API pública — só essa function, rodando no servidor, consegue escrever).
3. Depois do primeiro deploy, volte em Supabase → _Authentication → URL Configuration_ e adicione a URL da Vercel como redirect permitido do magic link.

## Acesso

Login por **link mágico** (e-mail corporativo `@msbbrasil.com`, sem senha) via Supabase Auth — ver `src/auth/AuthContext.tsx`. Só entram e-mails com conta previamente criada pelo RH no painel do Supabase (`shouldCreateUser: false`); não há cadastro aberto.

## Arquitetura

```
api/                        Vercel Serverless Functions (Node, só servidor — nunca no bundle do navegador)
  _lib/adminAuth.ts           confere sessão Supabase Auth válida; client admin com a service_role key
  desligar-colaborador.ts      POST — grava desligado/data_desligamento/motivo_desligamento na tabela
                              colaboradores (RLS não libera UPDATE público, só esta function)
src/
  types/domain.ts          entidades de domínio (Colaborador, ExameRegistro, MatrizOcupacional, ...)
  lib/supabaseClient.ts    cliente Supabase único, lido de variáveis de ambiente
  repositories/
    colaboradoresRepository.ts   busca colaboradores no Supabase (único dado pessoal/sensível) e
                                 chama api/desligar-colaborador.ts para persistir desligamentos
    portalRepository.ts          catálogos e matrizes estáticos, sem dado pessoal (JSON no bundle)
  domain/                  regras de negócio puras (status de exame, datas, textos/máscaras, matriz
                           função → EPI/exames) — testáveis isoladamente, sem React
  store/                   estado editável (entregas, anexos, preços, desligamentos) via
                           useReducer + Context; carrega colaboradores do Supabase ao logar e
                           limpa tudo (memória + localStorage) ao deslogar
  auth/                    Supabase Auth (magic link) + guarda de rotas
  components/ui/           design system (Card, KpiCard, StatusBadge, Table, Modal, Drawer, ...)
  components/layout/       casca do app (Sidebar, Header, AppShell)
  components/shared/       componentes reaproveitados entre módulos (ex.: PriceEditModal)
  features/
    auth/                  tela de login (link mágico)
    dashboard/              KPIs, conformidade, custos EPI/fardamento, previsto × realizado
    epi/                    Gestão de EPI (colaboradores, matriz, histórico, custos, fardamento)
    exames/                 Exames Ocupacionais (controle, vencimentos, pendências, matriz
                            ocupacional PCMSO+PGR, histórico, desligados)
    relatorios/             exportações (.csv) e indicadores
    config/                 departamentos, catálogo de EPI, integrações previstas
scripts/seed-supabase.mjs  carrega src/data/colaboradores.json (local) na tabela do Supabase
supabase/schema.sql        schema + RLS da tabela colaboradores
```

Princípios seguidos:

- **Inversão de dependência de dados**: nenhuma tela busca dados diretamente — tudo passa por um repositório (`colaboradoresRepository` ou `portalRepository`), então trocar a fonte de novo é uma mudança isolada num arquivo.
- **Lógica de negócio fora do React**: cálculo de status de exame (`Em dia/A vencer/Vencido/Necessita revisão`), idade, máscaras de CPF, matching de cargo→matriz etc. vivem em `src/domain/*.ts` como funções puras, sem hooks — fáceis de testar unitariamente.
- **Status sempre recalculado, nunca lido como valor congelado**: o campo `status` importado da planilha original é ignorado; tudo é recomputado a partir da data de hoje, então o portal continua correto conforme o tempo passa.
- **Estado editável separado da base de origem**: entregas de EPI, anexos de exame, preços e desligamentos vivem em `PortalStoreContext` (reducer com ações tipadas) e nunca sobrescrevem os dados de origem — mesmo padrão do protótipo original ("nunca substitui, sempre adiciona").

## Dados e privacidade (LGPD)

A base de colaboradores contém **dados reais**: nome completo, CPF, data de nascimento e histórico de exames de saúde. Como **este repositório é público**, esse dado nunca é commitado:

- `src/data/colaboradores.json` está no `.gitignore` — existe só localmente, em quem gerou a base original.
- `src/data/colaboradores.example.json` (versionado) mostra o formato esperado com dados fictícios.
- Em produção, os dados reais moram só no Postgres do Supabase, atrás de RLS (`supabase/schema.sql`): apenas usuários autenticados via Supabase Auth conseguem ler a tabela `colaboradores` — sem login, a API do Supabase não devolve nenhuma linha.
- `npm run seed:supabase` é o único jeito de popular a tabela do zero; usa a `service_role` key, que **nunca** deve ir para a Vercel nem para o bundle do navegador (só existe no `.env.local`, fora do git).
- Para **atualizar** cargo/departamento/nascimento a partir de uma planilha de RH mais nova (ex.: exportações "Colaboradores x Cargos x Departamentos"), use `scripts/gen-upsert-sql.mjs` (requer `npm install --no-save xlsx`) — ele mescla a planilha com `src/data/colaboradores.json` (casando por CPF ou, na falta dele, por nome) e gera um único SQL de `INSERT ... ON CONFLICT (id) DO UPDATE` em `supabase/local/*.sql` (pasta gitignored, nunca commitada). É **idempotente**: pode rodar no SQL Editor do Supabase independentemente da tabela já ter dados ou estar vazia — quem já existe é atualizado, quem não existe é criado, ninguém é apagado. Revise o SQL gerado antes de rodar.
- Ao deslogar, `PortalStoreContext` limpa colaboradores da memória e do `localStorage` do navegador.

Próximos incrementos de segurança sugeridos (fora do escopo atual):

1. Tabela `profiles` associando usuário Supabase → papel (`rh` / `leitura`), hoje todo usuário autenticado é tratado como RH.
2. Mover também o estado editável (entregas, anexos, preços, log) do `localStorage` para tabelas no Supabase — hoje só a leitura de colaboradores e o status de desligamento (`desligado`/`data_desligamento`/`motivo_desligamento`, direto na tabela `colaboradores`) foram migrados; ver `src/store/PortalStoreContext.tsx`.
3. Logging/auditoria server-side das ações do RH (hoje a trilha em **Exames → Histórico** é local ao navegador).

## Funcionalidades não implementadas (fora de escopo desta etapa)

- Importação de planilha Excel pelo navegador (havia um protótipo disso no design original) — ver aba **Configurações**, que documenta isso como item de roadmap.
- Integração **Academia MSB** — presente na navegação como "prevista", sem automação. **PeopleFlow** já tem uma integração real: os dois portais compartilham o mesmo projeto Supabase e a mesma tabela `colaboradores`; ao desligar alguém aqui, ele aparece automaticamente na aba Desligados do PeopleFlow (ver `api/desligar-colaborador.ts` e o README do PeopleFlow).
- Exportação de relatórios em PDF (apenas CSV foi implementado em **Relatórios**).
- Distinção real de papel "somente leitura" (hoje todo login autenticado tem permissão de RH — ver item 1 acima).
