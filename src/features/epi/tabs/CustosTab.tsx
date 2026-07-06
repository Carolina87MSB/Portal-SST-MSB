import { useMemo, useState } from "react";
import { History, Pencil } from "lucide-react";
import { Button, Card, EmptyState, ProgressBar, Table, Td, Th, THead, Tr } from "../../../components/ui";
import { PriceEditModal } from "../../../components/shared/PriceEditModal";
import { useAuth } from "../../../auth/AuthContext";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { portalRepository } from "../../../repositories/portalRepository";
import { fmtMoney } from "../../../domain/text";
import { isoToBR } from "../../../domain/dates";
import { demandaPorEquip } from "../lib/epiUtils";
import shared from "../EpiShared.module.css";
import styles from "./CustosTab.module.css";

interface LinhaCusto {
  equip: string;
  valorUnit: number;
  fornecedor: string;
  dataCotacao: string;
  historicoCount: number;
  historico: { valor: number; fornecedor: string; dataCotacao: string; ts: string }[];
  demanda: number;
  custo: number;
}

export function CustosTab() {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [editando, setEditando] = useState<string | null>(null);

  const catalogo = useMemo(() => portalRepository.getEpiCatalogo(), []);
  const matrizEpi = useMemo(() => portalRepository.getMatrizEpi(), []);
  const ativos = useMemo(() => state.colaboradores.filter((c) => !state.desligados[c.id]), [state.colaboradores, state.desligados]);
  const demandMap = useMemo(() => demandaPorEquip(ativos, matrizEpi), [ativos, matrizEpi]);

  const linhas = useMemo<LinhaCusto[]>(() => {
    const catalogNames = new Set(catalogo.map((c) => c.equip));
    const extras = Object.keys(state.epiPrecos).filter((k) => !catalogNames.has(k));
    const equipsBase = [...catalogo.map((c) => ({ equip: c.equip, catalogValor: c.valor })), ...extras.map((k) => ({ equip: k, catalogValor: undefined as number | undefined }))];

    return equipsBase
      .map(({ equip, catalogValor }) => {
        const preco = state.epiPrecos[equip];
        const valorUnit = preco?.valor ?? catalogValor ?? 0;
        const demanda = demandMap.get(equip) ?? 0;
        return {
          equip,
          valorUnit,
          fornecedor: preco?.fornecedor || "—",
          dataCotacao: preco?.dataCotacao || "—",
          historicoCount: preco?.historico.length ?? 0,
          historico: preco?.historico ?? [],
          demanda,
          custo: valorUnit * demanda,
        };
      })
      .sort((a, b) => b.demanda - a.demanda || a.equip.localeCompare(b.equip, "pt-BR"));
  }, [catalogo, state.epiPrecos, demandMap]);

  const totalCusto = useMemo(() => linhas.reduce((acc, l) => acc + l.custo, 0), [linhas]);
  const maxDemanda = useMemo(() => Math.max(1, ...linhas.map((l) => l.demanda)), [linhas]);

  const linhaEditando = editando ? linhas.find((l) => l.equip === editando) : undefined;

  function salvarPreco(valor: number, fornecedor: string, dataCotacaoIso: string) {
    if (!user || !editando) return;
    dispatch({
      type: "EDITAR_PRECO_EPI",
      equip: editando,
      valor,
      fornecedor,
      dataCotacao: dataCotacaoIso ? isoToBR(dataCotacaoIso) : "",
      by: user.email,
    });
  }

  return (
    <div className={styles.wrap}>
      <p className={shared.intro}>
        Os valores unitários de cada EPI são editáveis pelo RH e mantêm histórico de cotações. A demanda é calculada a partir da matriz de
        EPI por função — cada colaborador ativo soma 1 à demanda de todo equipamento obrigatório para sua função. O custo estimado é o
        produto entre o valor unitário vigente e a demanda.
      </p>

      <div className={shared.chipsRow}>
        <div className={shared.chip}>
          <div className={shared.chipLabel}>Custo total estimado</div>
          <div className={shared.chipValue}>{fmtMoney(totalCusto)}</div>
        </div>
        <div className={shared.chip}>
          <div className={shared.chipLabel}>Itens no catálogo</div>
          <div className={shared.chipValue}>{linhas.length}</div>
        </div>
      </div>

      <Card>
        {linhas.length === 0 ? (
          <EmptyState title="Nenhum item de EPI cadastrado" />
        ) : (
          <Table>
            <THead>
              <Th>Equipamento</Th>
              <Th>Demanda</Th>
              <Th>Valor unit.</Th>
              <Th>Fornecedor</Th>
              <Th>Cotação</Th>
              <Th>Custo estimado</Th>
              <Th>Participação</Th>
              {canEdit ? <Th>Ações</Th> : null}
            </THead>
            <tbody>
              {linhas.map((l) => (
                <Tr key={l.equip}>
                  <Td>
                    <div className={styles.equipCell}>
                      <strong>{l.equip}</strong>
                      {l.historicoCount > 0 ? (
                        <span className={styles.historyPill}>
                          <History size={11} /> {l.historicoCount}
                        </span>
                      ) : null}
                    </div>
                  </Td>
                  <Td>{l.demanda}</Td>
                  <Td mono>{fmtMoney(l.valorUnit)}</Td>
                  <Td>{l.fornecedor}</Td>
                  <Td mono>{l.dataCotacao}</Td>
                  <Td mono>
                    <strong>{fmtMoney(l.custo)}</strong>
                  </Td>
                  <Td>
                    <div className={styles.progressCell}>
                      <ProgressBar percent={(l.demanda / maxDemanda) * 100} />
                    </div>
                  </Td>
                  {canEdit ? (
                    <Td>
                      <Button variant="ghost" onClick={() => setEditando(l.equip)}>
                        <Pencil size={13} /> Editar valor
                      </Button>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {linhaEditando ? (
        <PriceEditModal
          title="Editar valor de EPI"
          itemLabel={linhaEditando.equip}
          valor={linhaEditando.valorUnit}
          fornecedor={linhaEditando.fornecedor === "—" ? "" : linhaEditando.fornecedor}
          dataCotacao={linhaEditando.dataCotacao === "—" ? "" : linhaEditando.dataCotacao}
          historico={linhaEditando.historico}
          onClose={() => setEditando(null)}
          onSave={salvarPreco}
        />
      ) : null}
    </div>
  );
}
