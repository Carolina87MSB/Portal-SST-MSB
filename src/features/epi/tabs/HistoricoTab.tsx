import { useMemo, useState } from "react";
import { Card, EmptyState, SearchInput, Select, Table, Td, Th, THead, TextInput, Tr } from "../../../components/ui";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { portalRepository } from "../../../repositories/portalRepository";
import { deptName, fmtMoney, titleCase } from "../../../domain/text";
import { parseBR } from "../../../domain/dates";
import { matchesColaboradorSearch } from "../lib/epiUtils";
import type { Colaborador, EntregaEpi } from "../../../types/domain";
import shared from "../EpiShared.module.css";
import styles from "./HistoricoTab.module.css";

interface Filtros {
  texto: string;
  epi: string;
  depto: string;
  cargo: string;
  de: string;
  ate: string;
}

const FILTROS_INICIAIS: Filtros = { texto: "", epi: "", depto: "", cargo: "", de: "", ate: "" };

function dentroDoPeriodo(dataBR: string, de: string, ate: string): boolean {
  const d = parseBR(dataBR);
  if (!d) return true;
  if (de && d < new Date(de)) return false;
  if (ate) {
    const limite = new Date(ate);
    limite.setHours(23, 59, 59, 999);
    if (d > limite) return false;
  }
  return true;
}

export function HistoricoTab() {
  const { state } = usePortalStore();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);

  const colabPorId = useMemo(() => {
    const map = new Map<number, Colaborador>();
    for (const c of state.colaboradores) map.set(c.id, c);
    return map;
  }, [state.colaboradores]);

  const epiOptions = useMemo(() => {
    const nomes = new Set<string>(portalRepository.getEpiCatalogo().map((c) => c.equip));
    for (const e of state.entregas) nomes.add(e.epi);
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [state.entregas]);

  const deptoOptions = useMemo(() => {
    const nomes = new Set(state.colaboradores.map((c) => deptName(c.departamento)));
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [state.colaboradores]);

  const cargoOptions = useMemo(() => {
    const idsComEntrega = new Set(state.entregas.map((e) => e.colabId));
    const nomes = new Set<string>();
    for (const c of state.colaboradores) {
      if (idsComEntrega.has(c.id) && c.cargo) nomes.add(titleCase(c.cargo));
    }
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [state.colaboradores, state.entregas]);

  const linhas = useMemo(() => {
    const filtered = state.entregas.filter((e) => {
      const colab = colabPorId.get(e.colabId);
      if (filtros.texto && (!colab || !matchesColaboradorSearch(colab, filtros.texto))) return false;
      if (filtros.epi && e.epi !== filtros.epi) return false;
      if (filtros.depto && deptName(colab?.departamento) !== filtros.depto) return false;
      if (filtros.cargo && (!colab?.cargo || titleCase(colab.cargo) !== filtros.cargo)) return false;
      if (!dentroDoPeriodo(e.dataEntrega, filtros.de, filtros.ate)) return false;
      return true;
    });
    return filtered
      .slice()
      .sort((a, b) => {
        const da = parseBR(a.dataEntrega)?.getTime() ?? 0;
        const db = parseBR(b.dataEntrega)?.getTime() ?? 0;
        return db - da;
      })
      .map((e) => ({ entrega: e, colab: colabPorId.get(e.colabId) }));
  }, [state.entregas, colabPorId, filtros]);

  const resumo = useMemo(() => {
    const totalItens = linhas.reduce((acc, { entrega }) => acc + entrega.qtd, 0);
    const totalCusto = linhas.reduce((acc, { entrega }) => acc + entrega.qtd * entrega.valorUnit, 0);
    return { totalEntregas: linhas.length, totalItens, totalCusto };
  }, [linhas]);

  function limpar() {
    setFiltros(FILTROS_INICIAIS);
  }

  return (
    <div className={styles.wrap}>
      <p className={shared.intro}>
        Cada entrega de EPI fica vinculada ao CPF do colaborador. O registro é sempre histórico: uma nova entrega gera uma nova linha e
        nunca sobrescreve um lançamento anterior, preservando a rastreabilidade completa para auditoria.
      </p>

      <Card className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <SearchInput
            placeholder="Colaborador ou CPF..."
            value={filtros.texto}
            onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
          />
          <Select
            options={[{ value: "", label: "Todos os EPIs" }, ...epiOptions.map((o) => ({ value: o, label: o }))]}
            value={filtros.epi}
            onChange={(e) => setFiltros((f) => ({ ...f, epi: e.target.value }))}
          />
          <Select
            options={[{ value: "", label: "Todos os departamentos" }, ...deptoOptions.map((o) => ({ value: o, label: o }))]}
            value={filtros.depto}
            onChange={(e) => setFiltros((f) => ({ ...f, depto: e.target.value }))}
          />
          <Select
            options={[{ value: "", label: "Todos os cargos" }, ...cargoOptions.map((o) => ({ value: o, label: o }))]}
            value={filtros.cargo}
            onChange={(e) => setFiltros((f) => ({ ...f, cargo: e.target.value }))}
          />
          <TextInput type="date" value={filtros.de} onChange={(e) => setFiltros((f) => ({ ...f, de: e.target.value }))} />
          <TextInput type="date" value={filtros.ate} onChange={(e) => setFiltros((f) => ({ ...f, ate: e.target.value }))} />
          <button type="button" className={styles.clearButton} onClick={limpar}>
            Limpar
          </button>
        </div>
      </Card>

      <div className={shared.chipsRow}>
        <div className={shared.chip}>
          <div className={shared.chipLabel}>Entregas</div>
          <div className={shared.chipValue}>{resumo.totalEntregas}</div>
        </div>
        <div className={shared.chip}>
          <div className={shared.chipLabel}>Itens</div>
          <div className={shared.chipValue}>{resumo.totalItens}</div>
        </div>
        <div className={shared.chip}>
          <div className={shared.chipLabel}>Custo no período</div>
          <div className={shared.chipValue}>{fmtMoney(resumo.totalCusto)}</div>
        </div>
      </div>

      <Card>
        {linhas.length === 0 ? (
          <EmptyState title="Nenhuma entrega encontrada" description="Ajuste os filtros para ver o histórico de entregas de EPI." />
        ) : (
          <Table>
            <THead>
              <Th>Entrega</Th>
              <Th>Colaborador</Th>
              <Th>EPI · CA</Th>
              <Th>Qtd</Th>
              <Th>Fornecedor</Th>
              <Th>V. unit.</Th>
              <Th>V. total</Th>
              <Th>Troca</Th>
              <Th>Responsável</Th>
            </THead>
            <tbody>
              {linhas.map(({ entrega, colab }) => (
                <EntregaRow key={entrega.id} entrega={entrega} colab={colab} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function EntregaRow({ entrega, colab }: { entrega: EntregaEpi; colab: Colaborador | undefined }) {
  return (
    <Tr>
      <Td mono>{entrega.dataEntrega}</Td>
      <Td>
        <div className={styles.colabCell}>
          <strong>{colab ? titleCase(colab.nome) : "Colaborador removido"}</strong>
          <span>{colab?.cargo ? titleCase(colab.cargo) : "—"}</span>
        </div>
      </Td>
      <Td>
        {entrega.epi}
        {entrega.ca ? <span className={styles.caTag}> · CA {entrega.ca}</span> : null}
      </Td>
      <Td>{entrega.qtd}</Td>
      <Td>{entrega.fornecedor || "—"}</Td>
      <Td mono>{fmtMoney(entrega.valorUnit)}</Td>
      <Td mono>
        <strong>{fmtMoney(entrega.qtd * entrega.valorUnit)}</strong>
      </Td>
      <Td mono>{entrega.dataTroca || "—"}</Td>
      <Td>{entrega.responsavel}</Td>
    </Tr>
  );
}
