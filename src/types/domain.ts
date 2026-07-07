// Entidades de domínio do Portal SST — espelham a base unificada EPI + ASO.

export type StatusExame = "Em dia" | "A vencer" | "Vencido" | "Necessita revisão" | "Pendente";

export interface ExameRegistro {
  proc: string;
  ultimo: string; // dd/mm/aaaa ou "—"
  proximo: string; // dd/mm/aaaa
  status: Exclude<StatusExame, "Pendente">;
}

export interface Colaborador {
  id: number;
  cpf: string;
  nome: string;
  cargo: string;
  departamento: string;
  epis: string[];
  exames: ExameRegistro[];
  origem: string;
  nascimento: string; // ISO aaaa-mm-dd
}

export interface MatrizEpiFuncao {
  funcao: string;
  epis: string[];
}

export interface MatrizProcFuncao {
  funcao: string;
  procedimentos: string[];
}

export interface EpiCatalogoItem {
  equip: string;
  valor: number;
}

export interface CatalogoExameOcupacional {
  codigo: string;
  nome: string;
  cargos: number;
  periodicidades: string[];
  situacoes: string[];
  obs: string[];
}

export interface CatalogoEpiOcupacional {
  epi: string;
  ca: string;
  cargos: number;
  riscos: string[];
}

export interface RiscoOcupacional {
  categoria: string;
  agente: string;
  exposicao: string;
}

export interface ExameOcupacionalCargo {
  codigo: string;
  nome: string;
  situacoes: string[];
  periodicidade: string;
  observacao: string;
}

export interface EpiOcupacionalCargo {
  epi: string;
}

export interface CargoOcupacional {
  nome: string;
  cbo: string;
  ambiente: string;
  riscos: RiscoOcupacional[];
  epis: EpiOcupacionalCargo[];
  exames: ExameOcupacionalCargo[];
  _addedBy?: string;
  _ts?: string;
}

export interface FonteOcupacional {
  pcmso: string;
  pgr: string;
  grauRisco: string;
  cnae: string;
}

export interface MatrizOcupacional {
  fonte: FonteOcupacional;
  catalogoExames: CatalogoExameOcupacional[];
  catalogoEpis: CatalogoEpiOcupacional[];
  cargos: CargoOcupacional[];
  observacoesGerais: string;
}

// ---------- estado editável (histórico, preços, desligamentos) ----------

export interface PrecoInfo {
  valor: number;
  fornecedor: string;
  dataCotacao: string;
  historico: PrecoHistoricoItem[];
}

export interface PrecoHistoricoItem {
  valor: number;
  fornecedor: string;
  dataCotacao: string;
  ts: string;
}

export interface EntregaEpi {
  id: string;
  colabId: number;
  cpf: string;
  epi: string;
  qtd: number;
  ca: string;
  fornecedor: string;
  valorUnit: number;
  dataEntrega: string; // dd/mm/aaaa
  dataTroca: string;
  obs: string;
  responsavel: string;
  assinatura: string;
  ts: string;
  /**
   * Ficha de entrega (FichaEntregaEpi) à qual esta entrega foi agrupada, quando o RH
   * gerou o PDF. Enquanto vazio, a entrega está no "lote aberto" do colaborador —
   * editável/excluível e ainda não impressa. Uma vez atribuída a uma ficha, a entrega
   * fica congelada (mesma lógica de "nunca substituir documento anterior").
   */
  fichaId?: string;
}

/**
 * Ficha de Entrega de EPI (PDF) — agrupa uma ou mais EntregaEpi geradas na mesma
 * solicitação. Novas entregas registradas depois da geração formam um novo lote,
 * que vira uma nova ficha na próxima vez que o RH gerar o PDF.
 */
export interface FichaEntregaEpi {
  id: string;
  colabId: number;
  /** ids das EntregaEpi incluídas nesta ficha, na ordem em que aparecem no PDF. */
  entregaIds: string[];
  geradaEm: string;
  geradaPor: string;
  /** Documento da ficha assinada, anexado pelo RH após a assinatura do colaborador (PDF/JPG/PNG). */
  assinaturaFileName?: string;
  assinaturaMime?: string;
  assinaturaDataUrl?: string;
  assinaturaAnexadaEm?: string;
  assinaturaResponsavel?: string;
}

export interface AttachmentExame {
  id: string;
  colabId: number;
  proc: string;
  dataISO: string;
  fornecedor: string;
  valor: number;
  fileName: string;
  /** Conteúdo do arquivo como data URL (base64), quando o usuário anexa um documento. Sem backend de arquivos, fica no próprio estado local. */
  fileDataUrl?: string;
  ts: string;
  responsavel: string;
}

export interface Desligamento {
  date: string;
  motivo: string;
  by: string;
}

export interface FardamentoEntrega {
  id: string;
  colabId: number;
  cpf: string;
  tipo: string;
  qtd: number;
  tamanho: string;
  valorUnit: number;
  fornecedor: string;
  dataEntrega: string;
  dataCompra: string;
  obs: string;
  responsavel: string;
  ts: string;
}

export interface FardamentoReparo {
  id: string;
  colabId: number;
  cpf: string;
  peca: string;
  tipoReparo: string;
  valor: number;
  fornecedor: string;
  dataReparo: string;
  obs: string;
  responsavel: string;
  ts: string;
}

export interface LogEntry {
  action: string;
  colabId: number | null;
  colabNome: string;
  detail: string;
  user: string;
  ts: string;
}

export interface CustoMesOrcado {
  mes: string; // aaaa-mm
  orcado: number;
  realizadoBase: number;
}

export type UserRole = "rh" | "leitura";

export interface AuthUser {
  email: string;
  role: UserRole;
}
