import { FileSpreadsheet } from "lucide-react";
import { usePortalStore } from "../../store/PortalStoreContext";
import { Card, ProgressBar } from "../../components/ui";
import { deptName, maskCpf, titleCase } from "../../domain/text";
import { statusDoRegistro } from "../../domain/exameStatus";
import { downloadCsv } from "../../domain/csv";
import styles from "./RelatoriosPage.module.css";

export function RelatoriosPage() {
  const { state } = usePortalStore();
  const ativos = state.colaboradores.filter((c) => !state.desligados[c.id]);

  const exames = ativos.flatMap((c) => c.exames ?? []);
  const emDia = exames.filter((e) => statusDoRegistro(e) === "Em dia").length;
  const classificados = ativos.filter((c) => c.epis && c.epis.length > 0).length;
  const epiPct = ativos.length ? Math.round((100 * classificados) / ativos.length) : 0;
  const asoPct = exames.length ? Math.round((100 * emDia) / exames.length) : 0;

  function exportarColaboradores() {
    downloadCsv(
      "colaboradores.csv",
      ativos.map((c) => ({
        nome: titleCase(c.nome),
        cpf: maskCpf(c.cpf),
        cargo: c.cargo ?? "",
        departamento: deptName(c.departamento),
        qtdEpis: c.epis?.length ?? 0,
      })),
    );
  }

  function exportarAso() {
    downloadCsv(
      "controle_aso.csv",
      ativos.flatMap((c) =>
        (c.exames ?? []).map((e) => ({
          colaborador: titleCase(c.nome),
          departamento: deptName(c.departamento),
          exame: e.proc,
          ultimo: e.ultimo,
          proximo: e.proximo,
          status: statusDoRegistro(e),
        })),
      ),
    );
  }

  return (
    <div className={styles.grid}>
      <Card>
        <div className={styles.title}>Exportações</div>
        <div className={styles.subtitle}>Gere planilhas para conferência offline ou envio a auditoria.</div>
        <div className={styles.buttonList}>
          <button type="button" className={styles.exportButton} onClick={exportarColaboradores}>
            <FileSpreadsheet size={17} color="#3d8499" /> Base de colaboradores (.csv)
          </button>
          <button type="button" className={styles.exportButton} onClick={exportarAso}>
            <FileSpreadsheet size={17} color="#3d8499" /> Controle de ASO (.csv)
          </button>
          <button type="button" className={styles.exportButtonDisabled} disabled title="Em preparação">
            <FileSpreadsheet size={17} /> Matriz de EPI por função (.pdf) — em breve
          </button>
        </div>
      </Card>

      <Card>
        <div className={styles.title}>Indicadores</div>
        <div className={styles.subtitle}>Resumo de conformidade do período.</div>
        <div className={styles.indicators}>
          <div>
            <div className={styles.indicatorRow}>
              <span>Colaboradores com matriz de EPI</span>
              <strong>{epiPct}%</strong>
            </div>
            <ProgressBar percent={epiPct} />
          </div>
          <div>
            <div className={styles.indicatorRow}>
              <span>Exames em dia</span>
              <strong>{asoPct}%</strong>
            </div>
            <ProgressBar percent={asoPct} />
          </div>
          <div>
            <div className={styles.indicatorRow}>
              <span>Treinamentos (Academia MSB)</span>
              <strong className={styles.muted}>—</strong>
            </div>
            <ProgressBar percent={0} />
          </div>
        </div>
      </Card>

      <Card className={styles.futureCard}>
        <div className={styles.title} style={{ color: "#fff" }}>
          Regras futuras previstas
        </div>
        <div className={styles.futureSubtitle}>Automação planejada para próximas etapas.</div>
        <div className={styles.futureList}>
          <div className={styles.futureItem}>
            <span className={styles.futureBullet}>›</span>
            <span>
              <strong>PeopleFlow:</strong> mudança de função recalcula automaticamente EPIs e exames aplicáveis.
            </span>
          </div>
          <div className={styles.futureItem}>
            <span className={styles.futureBullet}>›</span>
            <span>
              <strong>Academia MSB:</strong> CPF + função define os treinamentos obrigatórios, que entram como pendência de SST.
            </span>
          </div>
          <div className={styles.futureItem}>
            <span className={styles.futureBullet}>›</span>
            <span>
              <strong>Alertas:</strong> e-mail automático 30 dias antes de cada vencimento de ASO.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
