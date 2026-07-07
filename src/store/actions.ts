import type { CargoOcupacional, Colaborador } from "../types/domain";

export type PortalAction =
  | { type: "SET_COLABORADORES"; colaboradores: Colaborador[] }
  | {
      type: "REGISTRAR_ENTREGA_EPI";
      colabId: number;
      epi: string;
      qtd: number;
      ca: string;
      fornecedor: string;
      valorUnit: number;
      dataEntrega: string;
      dataTroca: string;
      obs: string;
      by: string;
    }
  | { type: "EDITAR_PRECO_EPI"; equip: string; valor: number; fornecedor: string; dataCotacao: string; by: string }
  | { type: "EDITAR_PRECO_EXAME"; codigo: string; valor: number; fornecedor: string; dataCotacao: string; by: string }
  | {
      type: "ANEXAR_EXAME";
      colabId: number;
      proc: string;
      dataISO: string;
      proximo: string;
      fornecedor: string;
      valor: number;
      fileName: string;
      fileDataUrl?: string;
      by: string;
    }
  | { type: "DESLIGAR_COLABORADOR"; colabId: number; date: string; motivo: string; by: string }
  | { type: "REINTEGRAR_COLABORADOR"; colabId: number; by: string }
  | { type: "ADICIONAR_CARGO_MATRIZ"; cargo: CargoOcupacional; by: string }
  | {
      type: "REGISTRAR_FARDAMENTO_ENTREGA";
      colabId: number;
      tipo: string;
      qtd: number;
      tamanho: string;
      valorUnit: number;
      fornecedor: string;
      dataEntrega: string;
      dataCompra: string;
      obs: string;
      by: string;
    }
  | {
      type: "REGISTRAR_FARDAMENTO_REPARO";
      colabId: number;
      peca: string;
      tipoReparo: string;
      valor: number;
      fornecedor: string;
      dataReparo: string;
      obs: string;
      by: string;
    }
  | { type: "EDITAR_PRECO_FARDAMENTO"; tipo: string; valor: number; fornecedor: string; dataCotacao: string; by: string }
  | { type: "MARCAR_FICHA_EPI_GERADA"; entregaId: string }
  | { type: "ANEXAR_FICHA_EPI_ASSINADA"; entregaId: string; fileName: string; fileDataUrl: string; mime: string; by: string }
  | { type: "RESET" };
