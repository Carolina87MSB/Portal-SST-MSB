import { stamp } from "../domain/dates";
import { titleCase } from "../domain/text";
import type { PrecoInfo } from "../types/domain";
import type { PortalAction } from "./actions";
import { buildInitialState, seedEntregas, seedFardEntregas, seedFardReparos, uid } from "./seed";
import type { PortalState } from "./types";

function nomeDoColab(state: PortalState, colabId: number): string {
  return titleCase(state.colaboradores.find((c) => c.id === colabId)?.nome ?? "");
}

function atualizarPreco(atual: PrecoInfo | undefined, valor: number, fornecedor: string, dataCotacao: string): PrecoInfo {
  const historico = atual
    ? [{ valor: atual.valor, fornecedor: atual.fornecedor, dataCotacao: atual.dataCotacao, ts: stamp() }, ...atual.historico]
    : [];
  return { valor, fornecedor, dataCotacao, historico };
}

export function portalReducer(state: PortalState, action: PortalAction): PortalState {
  switch (action.type) {
    case "SET_COLABORADORES": {
      // Seeds de demonstração (entregas/fardamento) só fazem sentido depois que
      // os colaboradores reais chegam do Supabase — semeamos uma única vez, no
      // primeiro carregamento (arrays ainda vazios), para não sobrescrever
      // lançamentos que o RH já tenha feito nesta sessão.
      const primeiraCarga = state.colaboradores.length === 0;
      return {
        ...state,
        colaboradores: action.colaboradores,
        entregas: primeiraCarga && state.entregas.length === 0 ? seedEntregas(action.colaboradores) : state.entregas,
        fardamentoEntregas:
          primeiraCarga && state.fardamentoEntregas.length === 0
            ? seedFardEntregas(action.colaboradores)
            : state.fardamentoEntregas,
        fardamentoReparos:
          primeiraCarga && state.fardamentoReparos.length === 0 ? seedFardReparos(action.colaboradores) : state.fardamentoReparos,
      };
    }

    case "REGISTRAR_ENTREGA_EPI": {
      const nome = nomeDoColab(state, action.colabId);
      const colab = state.colaboradores.find((c) => c.id === action.colabId);
      const entrega = {
        id: uid("E"),
        colabId: action.colabId,
        cpf: colab?.cpf ?? "",
        epi: action.epi,
        qtd: action.qtd,
        ca: action.ca,
        fornecedor: action.fornecedor,
        valorUnit: action.valorUnit,
        dataEntrega: action.dataEntrega,
        dataTroca: action.dataTroca,
        obs: action.obs,
        responsavel: action.by,
        assinatura: nome,
        ts: stamp(),
      };
      return {
        ...state,
        entregas: [entrega, ...state.entregas],
        log: [
          { action: "Entrega de EPI", colabId: action.colabId, colabNome: nome, detail: action.epi, user: action.by, ts: stamp() },
          ...state.log,
        ],
      };
    }

    case "EDITAR_PRECO_EPI": {
      return {
        ...state,
        epiPrecos: {
          ...state.epiPrecos,
          [action.equip]: atualizarPreco(state.epiPrecos[action.equip], action.valor, action.fornecedor, action.dataCotacao),
        },
        log: [
          { action: "Preço de EPI atualizado", colabId: null, colabNome: "", detail: action.equip, user: action.by, ts: stamp() },
          ...state.log,
        ],
      };
    }

    case "EDITAR_PRECO_EXAME": {
      return {
        ...state,
        examePrecos: {
          ...state.examePrecos,
          [action.codigo]: atualizarPreco(state.examePrecos[action.codigo], action.valor, action.fornecedor, action.dataCotacao),
        },
        log: [
          { action: "Preço de exame atualizado", colabId: null, colabNome: "", detail: action.codigo, user: action.by, ts: stamp() },
          ...state.log,
        ],
      };
    }

    case "ANEXAR_EXAME": {
      const nome = nomeDoColab(state, action.colabId);
      const colaboradores = state.colaboradores.map((c) => {
        if (c.id !== action.colabId) return c;
        const exames = c.exames.some((e) => e.proc === action.proc)
          ? c.exames.map((e) =>
              e.proc === action.proc ? { ...e, ultimo: action.dataISO, proximo: action.proximo, status: "Em dia" as const } : e,
            )
          : [...c.exames, { proc: action.proc, ultimo: action.dataISO, proximo: action.proximo, status: "Em dia" as const }];
        return { ...c, exames };
      });
      const attachment = {
        id: uid("A"),
        colabId: action.colabId,
        proc: action.proc,
        dataISO: action.dataISO,
        fornecedor: action.fornecedor,
        valor: action.valor,
        fileName: action.fileName,
        fileDataUrl: action.fileDataUrl,
        ts: stamp(),
        responsavel: action.by,
      };
      return {
        ...state,
        colaboradores,
        attachments: [attachment, ...state.attachments],
        log: [
          { action: "Exame anexado", colabId: action.colabId, colabNome: nome, detail: action.proc, user: action.by, ts: stamp() },
          ...state.log,
        ],
      };
    }

    case "DESLIGAR_COLABORADOR": {
      const nome = nomeDoColab(state, action.colabId);
      return {
        ...state,
        desligados: { ...state.desligados, [action.colabId]: { date: action.date, motivo: action.motivo, by: action.by } },
        log: [
          { action: "Colaborador desligado", colabId: action.colabId, colabNome: nome, detail: action.motivo, user: action.by, ts: stamp() },
          ...state.log,
        ],
      };
    }

    case "REINTEGRAR_COLABORADOR": {
      const { [action.colabId]: _removido, ...resto } = state.desligados;
      return { ...state, desligados: resto };
    }

    case "ADICIONAR_CARGO_MATRIZ": {
      const cargo = { ...action.cargo, _addedBy: action.by, _ts: stamp() };
      return {
        ...state,
        matrizAdd: [...state.matrizAdd, cargo],
        log: [
          { action: "Cargo adicionado à matriz", colabId: null, colabNome: "", detail: cargo.nome, user: action.by, ts: stamp() },
          ...state.log,
        ],
      };
    }

    case "REGISTRAR_FARDAMENTO_ENTREGA": {
      const colab = state.colaboradores.find((c) => c.id === action.colabId);
      const entrega = {
        id: uid("FE"),
        colabId: action.colabId,
        cpf: colab?.cpf ?? "",
        tipo: action.tipo,
        qtd: action.qtd,
        tamanho: action.tamanho,
        valorUnit: action.valorUnit,
        fornecedor: action.fornecedor,
        dataEntrega: action.dataEntrega,
        dataCompra: action.dataCompra,
        obs: action.obs,
        responsavel: action.by,
        ts: stamp(),
      };
      return {
        ...state,
        fardamentoEntregas: [entrega, ...state.fardamentoEntregas],
        log: [
          {
            action: "Entrega de fardamento",
            colabId: action.colabId,
            colabNome: nomeDoColab(state, action.colabId),
            detail: action.tipo,
            user: action.by,
            ts: stamp(),
          },
          ...state.log,
        ],
      };
    }

    case "REGISTRAR_FARDAMENTO_REPARO": {
      const colab = state.colaboradores.find((c) => c.id === action.colabId);
      const reparo = {
        id: uid("FR"),
        colabId: action.colabId,
        cpf: colab?.cpf ?? "",
        peca: action.peca,
        tipoReparo: action.tipoReparo,
        valor: action.valor,
        fornecedor: action.fornecedor,
        dataReparo: action.dataReparo,
        obs: action.obs,
        responsavel: action.by,
        ts: stamp(),
      };
      return {
        ...state,
        fardamentoReparos: [reparo, ...state.fardamentoReparos],
        log: [
          {
            action: "Reparo de fardamento",
            colabId: action.colabId,
            colabNome: nomeDoColab(state, action.colabId),
            detail: action.tipoReparo,
            user: action.by,
            ts: stamp(),
          },
          ...state.log,
        ],
      };
    }

    case "EDITAR_PRECO_FARDAMENTO": {
      return {
        ...state,
        fardamentoPrecos: {
          ...state.fardamentoPrecos,
          [action.tipo]: atualizarPreco(state.fardamentoPrecos[action.tipo], action.valor, action.fornecedor, action.dataCotacao),
        },
        log: [
          { action: "Preço de fardamento atualizado", colabId: null, colabNome: "", detail: action.tipo, user: action.by, ts: stamp() },
          ...state.log,
        ],
      };
    }

    case "RESET":
      return buildInitialState();

    default:
      return state;
  }
}
