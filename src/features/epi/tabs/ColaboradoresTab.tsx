import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Avatar, Button, Card, EmptyState, SearchInput, Select, Table, Td, Th, THead, Tr } from "../../../components/ui";
import { usePortalStore } from "../../../store/PortalStoreContext";
import { portalRepository } from "../../../repositories/portalRepository";
import { deptName, iniciais, maskCpf, titleCase } from "../../../domain/text";
import { idadeFromISO } from "../../../domain/dates";
import { downloadCsv } from "../../../domain/csv";
import { divergenciaEpiPara, matchesColaboradorSearch } from "../lib/epiUtils";
import { EpiFichaDrawer } from "../EpiFichaDrawer";
import shared from "../EpiShared.module.css";
import styles from "./ColaboradoresTab.module.css";

export function ColaboradoresTab() {
  const { state } = usePortalStore();
  const [search, setSearch] = useState("");
  const [depto, setDepto] = useState("");
  const [selectedColabId, setSelectedColabId] = useState<number | null>(null);

  const matrizEpi = useMemo(() => portalRepository.getMatrizEpi(), []);

  const ativos = useMemo(() => state.colaboradores.filter((c) => !state.desligados[c.id]), [state.colaboradores, state.desligados]);

  const departamentos = useMemo(() => {
    const nomes = new Set(ativos.map((c) => deptName(c.departamento)));
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [ativos]);

  const filtrados = useMemo(() => {
    return ativos.filter((c) => {
      if (depto && deptName(c.departamento) !== depto) return false;
      return matchesColaboradorSearch(c, search);
    });
  }, [ativos, search, depto]);

  const linhas = useMemo(
    () =>
      filtrados
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((c) => ({ colaborador: c, divergencia: divergenciaEpiPara(c, matrizEpi, state.entregas) })),
    [filtrados, matrizEpi, state.entregas],
  );

  function exportar() {
    downloadCsv(
      "epi_colaboradores.csv",
      linhas.map(({ colaborador: c, divergencia }) => ({
        nome: titleCase(c.nome),
        cpf: maskCpf(c.cpf),
        departamento: deptName(c.departamento),
        cargo: c.cargo ? titleCase(c.cargo) : "",
        idade: idadeFromISO(c.nascimento) ?? "",
        episObrigatorios: divergencia.obrigatorios.length,
        semEntrega: divergencia.semEntrega.length,
      })),
    );
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.toolbarCard}>
        <div className={shared.toolbar}>
          <div className={shared.toolbarLeft}>
            <SearchInput placeholder="Buscar por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select
              options={[{ value: "", label: "Todos os departamentos" }, ...departamentos.map((d) => ({ value: d, label: d }))]}
              value={depto}
              onChange={(e) => setDepto(e.target.value)}
            />
          </div>
          <div className={shared.toolbarRight}>
            <Button variant="secondary" onClick={exportar}>
              <Download size={15} /> Exportar
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        {linhas.length === 0 ? (
          <EmptyState title="Nenhum colaborador encontrado" description="Ajuste a busca ou o filtro de departamento." />
        ) : (
          <Table>
            <THead>
              <Th>Colaborador</Th>
              <Th>CPF</Th>
              <Th>Departamento</Th>
              <Th>Cargo</Th>
              <Th>Idade</Th>
              <Th>EPIs / classificação</Th>
              <Th>Ficha</Th>
            </THead>
            <tbody>
              {linhas.map(({ colaborador: c, divergencia }) => {
                const idade = idadeFromISO(c.nascimento);
                return (
                  <Tr key={c.id}>
                    <Td>
                      <div className={styles.colabCell}>
                        <Avatar iniciais={iniciais(c.nome)} size={32} />
                        <span>{titleCase(c.nome)}</span>
                      </div>
                    </Td>
                    <Td mono>{maskCpf(c.cpf)}</Td>
                    <Td>{deptName(c.departamento)}</Td>
                    <Td>{c.cargo ? titleCase(c.cargo) : "—"}</Td>
                    <Td>{idade != null ? `${idade} anos` : "—"}</Td>
                    <Td>
                      <div className={shared.pillGroup}>
                        {divergencia.obrigatorios.length > 0 ? (
                          <button type="button" className={shared.pillInfo} onClick={() => setSelectedColabId(c.id)}>
                            {divergencia.obrigatorios.length} EPIs
                          </button>
                        ) : (
                          <span className={shared.pillWarning}>Pendente de classificação</span>
                        )}
                        {divergencia.semEntrega.length > 0 ? (
                          <span className={shared.pillDanger}>{divergencia.semEntrega.length} sem entrega</span>
                        ) : null}
                      </div>
                    </Td>
                    <Td>
                      <button type="button" className={styles.fichaLink} onClick={() => setSelectedColabId(c.id)}>
                        Ver ficha
                      </button>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <div className={shared.footerNote}>
        {linhas.length} de {ativos.length} colaborador{ativos.length === 1 ? "" : "es"} ativo{ativos.length === 1 ? "" : "s"} · CPF exibido
        de forma mascarada · chave única de identificação
      </div>

      {selectedColabId != null ? <EpiFichaDrawer colabId={selectedColabId} onClose={() => setSelectedColabId(null)} /> : null}
    </div>
  );
}
