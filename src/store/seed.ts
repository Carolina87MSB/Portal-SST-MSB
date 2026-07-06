import { portalRepository } from "../repositories/portalRepository";
import type { EntregaEpi, FardamentoEntrega, FardamentoReparo, PrecoInfo } from "../types/domain";
import { titleCase } from "../domain/text";
import type { CustoMesEpi, CustoMesFardamento, PortalState } from "./types";

function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const RESPONSAVEL_PADRAO = "carolina.cruz@msbbrasil.com";

function seedEntregas(colaboradores: PortalState["colaboradores"]): EntregaEpi[] {
  const byId = (id: number) => colaboradores.find((c) => c.id === id);
  const mk = (
    colabId: number,
    epi: string,
    qtd: number,
    ca: string,
    fornecedor: string,
    valorUnit: number,
    dataEntrega: string,
    dataTroca: string,
    obs: string,
    ts: string,
  ): EntregaEpi => {
    const c = byId(colabId);
    return {
      id: uid("E"),
      colabId,
      cpf: c?.cpf ?? "",
      epi,
      qtd,
      ca,
      fornecedor,
      valorUnit,
      dataEntrega,
      dataTroca,
      obs,
      responsavel: RESPONSAVEL_PADRAO,
      assinatura: titleCase(c?.nome ?? ""),
      ts,
    };
  };
  return [
    mk(1, "Calçado Antiderrapante", 1, "CA 28076", "EPI Sul Distribuidora", 80, "12/01/2026", "12/01/2027", "Entrega admissional", "12/01/2026 09:14"),
    mk(1, "Protetor Auricular Interno", 2, "CA 5745", "EPI Sul Distribuidora", 1, "12/01/2026", "12/07/2026", "", "12/01/2026 09:15"),
    mk(1, "Óculos de Proteção Transparente", 1, "CA 15691", "Protec Equipamentos", 10, "12/01/2026", "12/01/2027", "", "12/01/2026 09:16"),
    mk(1, "Abafador 3M Muffler", 1, "CA 12506", "Protec Equipamentos", 80, "20/03/2026", "20/03/2028", "Troca por desgaste", "20/03/2026 14:02"),
    mk(2, "Calçado Antiderrapante", 1, "CA 28076", "EPI Sul Distribuidora", 80, "05/02/2026", "05/02/2027", "", "05/02/2026 10:30"),
    mk(2, "Máscara Semifacial", 1, "CA 38400", "Protec Equipamentos", 70, "05/02/2026", "05/08/2026", "", "05/02/2026 10:31"),
  ];
}

function seedFardEntregas(colaboradores: PortalState["colaboradores"]): FardamentoEntrega[] {
  const byId = (id: number) => colaboradores.find((c) => c.id === id);
  const mk = (
    colabId: number,
    tipo: string,
    qtd: number,
    tamanho: string,
    valorUnit: number,
    fornecedor: string,
    dataEntrega: string,
    dataCompra: string,
    obs: string,
    ts: string,
  ): FardamentoEntrega => {
    const c = byId(colabId);
    return {
      id: uid("FE"),
      colabId,
      cpf: c?.cpf ?? "",
      tipo,
      qtd,
      tamanho,
      valorUnit,
      fornecedor,
      dataEntrega,
      dataCompra,
      obs,
      responsavel: RESPONSAVEL_PADRAO,
      ts,
    };
  };
  return [
    mk(1, "Conjunto de Helanca", 2, "M", 65, "Uniformes Bahia", "10/06/2026", "02/06/2026", "Entrega admissional", "10/06/2026 08:40"),
  ];
}

function seedFardReparos(colaboradores: PortalState["colaboradores"]): FardamentoReparo[] {
  const byId = (id: number) => colaboradores.find((c) => c.id === id);
  const mk = (
    colabId: number,
    peca: string,
    tipoReparo: string,
    valor: number,
    fornecedor: string,
    dataReparo: string,
    obs: string,
    ts: string,
  ): FardamentoReparo => {
    const c = byId(colabId);
    return {
      id: uid("FR"),
      colabId,
      cpf: c?.cpf ?? "",
      peca,
      tipoReparo,
      valor,
      fornecedor,
      dataReparo,
      obs,
      responsavel: RESPONSAVEL_PADRAO,
      ts,
    };
  };
  return [mk(1, "Conjunto de Helanca", "Troca de zíper", 25, "Costura Express", "18/06/2026", "", "18/06/2026 16:20")];
}

const CUSTOS_EPI_SEED: CustoMesEpi[] = [
  { mes: "2026-01", orcado: 5000, realizadoBase: 4200 },
  { mes: "2026-02", orcado: 5000, realizadoBase: 6300 },
  { mes: "2026-03", orcado: 5000, realizadoBase: 4750 },
  { mes: "2026-04", orcado: 5500, realizadoBase: 5120 },
  { mes: "2026-05", orcado: 5500, realizadoBase: 4980 },
  { mes: "2026-06", orcado: 5500, realizadoBase: 3850 },
];

const CUSTOS_FARDAMENTO_SEED: CustoMesFardamento[] = [
  { mes: "2026-01", orcado: 3000, entregaBase: 2400, reparoBase: 180 },
  { mes: "2026-02", orcado: 3000, entregaBase: 1950, reparoBase: 240 },
  { mes: "2026-03", orcado: 3000, entregaBase: 3380, reparoBase: 120 },
  { mes: "2026-04", orcado: 3200, entregaBase: 2760, reparoBase: 300 },
  { mes: "2026-05", orcado: 3200, entregaBase: 2510, reparoBase: 150 },
  { mes: "2026-06", orcado: 3200, entregaBase: 1820, reparoBase: 90 },
];

const FARDAMENTO_TIPOS_SEED: Array<[string, number]> = [
  ["Conjunto de Helanca", 65],
  ["Conjunto Logística", 90],
  ["Camisa Polo", 45],
  ["Calça Operacional", 80],
  ["Jaleco Técnico", 55],
];

export function buildInitialState(): PortalState {
  const colaboradores = structuredClone(portalRepository.getColaboradores());

  const epiPrecos: Record<string, PrecoInfo> = {};
  portalRepository.getEpiCatalogo().forEach((c) => {
    epiPrecos[c.equip] = { valor: c.valor, fornecedor: "", dataCotacao: "", historico: [] };
  });

  const examePrecos: Record<string, PrecoInfo> = {};
  portalRepository.getMatrizOcupacional().catalogoExames.forEach((e) => {
    examePrecos[e.codigo] = { valor: 0, fornecedor: "", dataCotacao: "", historico: [] };
  });

  const fardamentoPrecos: Record<string, PrecoInfo> = {};
  FARDAMENTO_TIPOS_SEED.forEach(([tipo, valor]) => {
    fardamentoPrecos[tipo] = { valor, fornecedor: "", dataCotacao: "", historico: [] };
  });

  return {
    version: 1,
    colaboradores,
    entregas: seedEntregas(colaboradores),
    attachments: [],
    desligados: {},
    epiPrecos,
    examePrecos,
    fardamentoPrecos,
    fardamentoEntregas: seedFardEntregas(colaboradores),
    fardamentoReparos: seedFardReparos(colaboradores),
    matrizAdd: [],
    custosEpi: CUSTOS_EPI_SEED,
    custosFardamento: CUSTOS_FARDAMENTO_SEED,
    log: [],
  };
}

export { uid };
