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
}

export interface AttachmentExame {
  id: string;
  colabId: number;
  proc: string;
  dataISO: string;
  fornecedor: string;
  valor: number;
  fileName: string;
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
