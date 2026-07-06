# Portal SST · MSB

Portal interno de RH/SST (Segurança e Saúde do Trabalho) da MSB — gestão de EPI e controle de Exames Ocupacionais (ASO), com base unificada de 49 colaboradores e a matriz ocupacional (PCMSO + PGR).

Reconstruído a partir de um protótipo visual (pasta `Portal SST MSB.zip`, modelo "Moderno · Dashboard") como uma aplicação real em **React + TypeScript + Vite**, com arquitetura em camadas e sem dependência de nenhuma ferramenta proprietária.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) 20+ (instalado automaticamente nesta máquina via `winget install OpenJS.NodeJS.LTS` durante a criação deste projeto).

```bash
cd portal-sst
npm install   # apenas na primeira vez
npm run dev   # ambiente de desenvolvimento, http://localhost:5173
npm run build # build de produção em dist/
npm run lint  # oxlint
```

## Acesso

A tela de login libera acesso apenas para e-mails corporativos autorizados pelo RH (lista em `src/auth/AuthContext.tsx`):

- `carolina.cruz@msbbrasil.com`
- `leslie.souza@msbbrasil.com`

Não há autocadastro. Essa é uma verificação **client-side**, adequada para uso interno controlado — ver nota de segurança abaixo antes de expor o portal fora de uma rede confiável.

## Arquitetura

```
src/
  types/domain.ts        entidades de domínio (Colaborador, ExameRegistro, MatrizOcupacional, ...)
  repositories/           camada de acesso a dados — hoje lê JSON estático; trocável por API sem
                          tocar o resto do app (ver portalRepository.ts)
  domain/                 regras de negócio puras (status de exame, datas, textos/máscaras, matriz
                          função → EPI/exames) — testáveis isoladamente, sem React
  store/                  estado editável (entregas, anexos, preços, desligamentos) via
                          useReducer + Context, persistido em localStorage
  auth/                   autenticação client-side (whitelist de e-mail) + guarda de rotas
  components/ui/          design system (Card, KpiCard, StatusBadge, Table, Modal, Drawer, ...)
  components/layout/      casca do app (Sidebar, Header, AppShell)
  components/shared/      componentes reaproveitados entre módulos (ex.: PriceEditModal)
  features/
    auth/                 tela de login
    dashboard/             KPIs, conformidade, custos EPI/fardamento, previsto × realizado
    epi/                   Gestão de EPI (colaboradores, matriz, histórico, custos, fardamento)
    exames/                Exames Ocupacionais (controle, vencimentos, pendências, matriz
                           ocupacional PCMSO+PGR, histórico, desligados)
    relatorios/            exportações (.csv) e indicadores
    config/                departamentos, catálogo de EPI, integrações previstas
```

Princípios seguidos:

- **Inversão de dependência de dados**: nenhuma tela importa os arquivos JSON diretamente — tudo passa por `portalRepository`, então trocar a fonte por uma API real é uma mudança em um único arquivo.
- **Lógica de negócio fora do React**: cálculo de status de exame (`Em dia/A vencer/Vencido/Necessita revisão`), idade, máscaras de CPF, matching de cargo→matriz etc. vivem em `src/domain/*.ts` como funções puras, sem hooks — fáceis de testar unitariamente.
- **Status sempre recalculado, nunca lido como valor congelado**: o campo `status` importado da planilha original é ignorado; tudo é recomputado a partir da data de hoje, então o portal continua correto conforme o tempo passa.
- **Estado editável separado da base de origem**: entregas de EPI, anexos de exame, preços e desligamentos vivem em `PortalStoreContext` (reducer com ações tipadas) e nunca sobrescrevem os dados de origem — mesmo padrão do protótipo original ("nunca substitui, sempre adiciona").

## Dados e privacidade (LGPD)

A base de colaboradores (`src/data/colaboradores.json`) contém **dados reais**: nome completo, CPF, data de nascimento e histórico de exames de saúde de 49 colaboradores da MSB.

**Este repositório é público.** Por isso, `src/data/colaboradores.json` está no `.gitignore` e nunca é commitado — o arquivo existe apenas localmente na máquina de quem gerou a base original. Em seu lugar, `src/data/colaboradores.example.json` (versionado) mostra o formato esperado com dados fictícios, para que qualquer pessoa consiga rodar o projeto localmente.

**Isso significa que o build de produção (Vercel) vai falhar até a fonte de dados ser migrada** — hoje `portalRepository.ts` importa `colaboradores.json` estaticamente, e esse arquivo não existe no repositório público. Plano decidido: mover essa base para o **Supabase** (Postgres com Row Level Security) e trocar a implementação de `portalRepository.getColaboradores()` para buscar de lá em vez do `import` estático — os demais arquivos em `src/data/*.json` (catálogos, matrizes) não contêm dado pessoal e podem continuar estáticos.

Antes desse deploy, considere também:

1. Autenticação real (Supabase Auth ou SSO corporativo) no lugar da whitelist client-side em `src/auth/AuthContext.tsx`.
2. Regras de acesso (RLS) no Supabase equivalentes à distinção RH/leitura já modelada em `UserRole`.
3. Logging/auditoria server-side das ações do RH (hoje a trilha de auditoria em **Exames → Histórico** fica só no `localStorage` do navegador).

## Funcionalidades não implementadas (fora de escopo desta etapa)

- Importação de planilha Excel pelo navegador (havia um protótipo disso no design original) — ver aba **Configurações**, que documenta isso como item de roadmap.
- Integrações **PeopleFlow** e **Academia MSB** — presentes na navegação como "previstas", sem automação.
- Exportação de relatórios em PDF (apenas CSV foi implementado em **Relatórios**).
