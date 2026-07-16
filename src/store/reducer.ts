import { stamp } from "../domain/dates";
import { titleCase } from "../domain/text";
import type { PrecoInfo } from "../types/domain";
import type { PortalAction } from "./actions";
import { buildInitialState, uid } from "./seed";
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
      // A tabela colaboradores agora é a fonte da verdade para desligamento
      // (ver api/desligar-colaborador.ts) — reconstrói state.desligados a
      // partir dela a cada carga, em vez de confiar em estado local antigo.
      const desligados: PortalState["desligados"] = {};
      action.colaboradores.forEach((c) => {
        if (c.desligado) {
          desligados[c.id] = { date: c.dataDesligamento, motivo: c.motivoDesligamento, by: c.desligadoBy };
        }
      });
      return { ...state, colaboradores: action.colaboradores, desligados };
    }

    case "SET_DESLIGAMENTOS_PENDENTES":
      return { ...state, desligamentosPendentes: action.desligamentosPendentes };

    case "REMOVER_DESLIGAMENTO_PENDENTE":
      return {
        ...state,
        desligamentosPendentes: state.desligamentosPendentes.filter((d) => d.colaboradorNome !== action.colaboradorNome),
      };

    case "SET_ENTREGAS_EPI":
      return { ...state, entregas: action.entregas };

    case "SET_FICHAS_EPI":
      return { ...state, fichasEpi: action.fichasEpi };

    case "SET_ANEXOS_EXAMES":
      return { ...state, attachments: action.attachments };

    case "REGISTRAR_ENTREGA_EPI": {
      const nome = nomeDoColab(state, action.entrega.colabId);
      return {
        ...state,
        entregas: [action.entrega, ...state.entregas],
        log: [
          { action: "Entrega de EPI", colabId: action.entrega.colabId, colabNome: nome, detail: action.entrega.epi, user: action.by, ts: stamp() },
          ...state.log,
        ],
      };
    }

    case "EDITAR_ENTREGA_EPI": {
      const entrega = state.entregas.find((e) => e.id === action.entregaId);
      // Uma vez incluída numa ficha gerada, a entrega fica congelada — corrigir
      // exigiria reemitir a ficha e invalidar uma possível via já assinada.
      if (!entrega || entrega.fichaId) return state;
      return {
        ...state,
        entregas: state.entregas.map((e) =>
          e.id === action.entregaId
            ? {
                ...e,
                epi: action.epi,
                qtd: action.qtd,
                ca: action.ca,
                fornecedor: action.fornecedor,
                valorUnit: action.valorUnit,
                dataEntrega: action.dataEntrega,
                dataTroca: action.dataTroca,
                obs: action.obs,
              }
            : e,
        ),
        log: [
          {
            action: "Entrega de EPI editada",
            colabId: entrega.colabId,
            colabNome: nomeDoColab(state, entrega.colabId),
            detail: action.epi,
            user: action.by,
            ts: stamp(),
          },
          ...state.log,
        ],
      };
    }

    case "EXCLUIR_ENTREGA_EPI": {
      const entrega = state.entregas.find((e) => e.id === action.entregaId);
      if (!entrega || entrega.fichaId) return state;
      return {
        ...state,
        entregas: state.entregas.filter((e) => e.id !== action.entregaId),
        log: [
          {
            action: "Entrega de EPI excluída",
            colabId: entrega.colabId,
            colabNome: nomeDoColab(state, entrega.colabId),
            detail: entrega.epi,
            user: action.by,
            ts: stamp(),
          },
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
      const nome = nomeDoColab(state, action.anexo.colabId);
      const colaboradores = state.colaboradores.map((c) => {
        if (c.id !== action.anexo.colabId) return c;
        const exames = c.exames.some((e) => e.proc === action.anexo.proc)
          ? c.exames.map((e) =>
              e.proc === action.anexo.proc
                ? { ...e, ultimo: action.anexo.dataISO, proximo: action.proximo, status: "Em dia" as const }
                : e,
            )
          : [...c.exames, { proc: action.anexo.proc, ultimo: action.anexo.dataISO, proximo: action.proximo, status: "Em dia" as const }];
        return { ...c, exames };
      });
      return {
        ...state,
        colaboradores,
        attachments: [action.anexo, ...state.attachments],
        log: [
          { action: "Exame anexado", colabId: action.anexo.colabId, colabNome: nome, detail: action.anexo.proc, user: action.by, ts: stamp() },
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

    case "ATUALIZAR_DADOS_COLABORADOR": {
      const colaboradores = state.colaboradores.map((c) =>
        c.id === action.colabId
          ? { ...c, cpf: action.cpf, nome: action.nome, cargo: action.cargo, departamento: action.departamento, nascimento: action.nascimento }
          : c,
      );
      return {
        ...state,
        colaboradores,
        log: [
          { action: "Cadastro do colaborador atualizado", colabId: action.colabId, colabNome: titleCase(action.nome), detail: "", user: action.by, ts: stamp() },
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

    case "GERAR_FICHA_EPI": {
      // Agrupa todas as entregas do "lote aberto" (ainda sem fichaId) informadas
      // pela UI numa única ficha nova. Entregas registradas depois formam o
      // próximo lote, que virará outra ficha na próxima geração.
      const idsValidos = new Set(
        action.entregaIds.filter((id) => {
          const e = state.entregas.find((x) => x.id === id);
          return e && e.colabId === action.colabId && !e.fichaId;
        }),
      );
      if (idsValidos.size === 0) return state;
      const ficha = {
        id: action.fichaId,
        // sequencial global (nunca reaproveitado, mesmo que uma ficha antiga seja removida no futuro) —
        // calculado pelo chamador (mesmo valor já gravado no Supabase por gerarFichaEpi()).
        numero: action.numero,
        colabId: action.colabId,
        entregaIds: [...idsValidos],
        geradaEm: stamp(),
        geradaPor: action.by,
      };
      return {
        ...state,
        entregas: state.entregas.map((e) => (idsValidos.has(e.id) ? { ...e, fichaId: ficha.id } : e)),
        fichasEpi: [ficha, ...state.fichasEpi],
        log: [
          {
            action: "Ficha de entrega de EPI gerada",
            colabId: action.colabId,
            colabNome: nomeDoColab(state, action.colabId),
            detail: `${idsValidos.size} item(ns)`,
            user: action.by,
            ts: stamp(),
          },
          ...state.log,
        ],
      };
    }

    case "ANEXAR_FICHA_EPI_ASSINADA": {
      const ficha = state.fichasEpi.find((f) => f.id === action.fichaId);
      if (!ficha) return state;
      return {
        ...state,
        fichasEpi: state.fichasEpi.map((f) =>
          f.id === action.fichaId
            ? {
                ...f,
                assinaturaFileName: action.fileName,
                assinaturaStoragePath: action.storagePath,
                assinaturaMime: action.mime,
                assinaturaAnexadaEm: stamp(),
                assinaturaResponsavel: action.by,
              }
            : f,
        ),
        log: [
          {
            action: "Ficha de EPI assinada anexada",
            colabId: ficha.colabId,
            colabNome: nomeDoColab(state, ficha.colabId),
            detail: `${ficha.entregaIds.length} item(ns)`,
            user: action.by,
            ts: stamp(),
          },
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
