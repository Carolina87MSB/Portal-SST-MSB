import type {
  AttachmentExame,
  CargoOcupacional,
  Colaborador,
  DesligamentoPendente,
  EntregaEpi,
  FichaEntregaEpi,
} from "../types/domain";

export type PortalAction =
  | { type: "SET_COLABORADORES"; colaboradores: Colaborador[] }
  | { type: "SET_DESLIGAMENTOS_PENDENTES"; desligamentosPendentes: DesligamentoPendente[] }
  | { type: "REMOVER_DESLIGAMENTO_PENDENTE"; colaboradorNome: string }
  // Entregas/fichas de EPI e anexos de exame agora são carregados do Supabase
  // (ver anexosExamesRepository.ts / fichasEpiRepository.ts) assim que a
  // sessão é confirmada — mesmo padrão de SET_COLABORADORES.
  | { type: "SET_ENTREGAS_EPI"; entregas: EntregaEpi[] }
  | { type: "SET_FICHAS_EPI"; fichasEpi: FichaEntregaEpi[] }
  | { type: "SET_ANEXOS_EXAMES"; attachments: AttachmentExame[] }
  // `entrega` já vem persistida (ver fichasEpiRepository.registrarEntregaEpi) — o
  // reducer só precisa somar ao estado local e registrar no log.
  | { type: "REGISTRAR_ENTREGA_EPI"; entrega: EntregaEpi; by: string }
  | {
      type: "EDITAR_ENTREGA_EPI";
      entregaId: string;
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
  | { type: "EXCLUIR_ENTREGA_EPI"; entregaId: string; by: string }
  | { type: "EDITAR_PRECO_EPI"; equip: string; valor: number; fornecedor: string; dataCotacao: string; by: string }
  | { type: "EDITAR_PRECO_EXAME"; codigo: string; valor: number; fornecedor: string; dataCotacao: string; by: string }
  // `anexo` já vem persistido (ver anexosExamesRepository.anexarExame) — o
  // reducer só precisa somar ao estado local, patchar colaboradores.exames
  // (localmente — a gravação real já aconteceu via api/atualizar-exame) e
  // registrar no log.
  | { type: "ANEXAR_EXAME"; anexo: AttachmentExame; proximo: string; by: string }
  | { type: "DESLIGAR_COLABORADOR"; colabId: number; date: string; motivo: string; by: string }
  | {
      type: "ATUALIZAR_DADOS_COLABORADOR";
      colabId: number;
      cpf: string;
      nome: string;
      cargo: string;
      departamento: string;
      nascimento: string;
      by: string;
    }
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
  | { type: "GERAR_FICHA_EPI"; fichaId: string; numero: number; colabId: number; entregaIds: string[]; by: string }
  | { type: "ANEXAR_FICHA_EPI_ASSINADA"; fichaId: string; fileName: string; storagePath: string; mime: string; by: string }
  | { type: "RESET" };
