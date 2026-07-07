import { useMemo, useState } from "react";
import { CircleCheck, PackagePlus, TriangleAlert } from "lucide-react";
import { Avatar, Button, Drawer } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { usePortalStore } from "../../store/PortalStoreContext";
import { portalRepository } from "../../repositories/portalRepository";
import { deptName, fmtMoney, iniciais, maskCpf, titleCase } from "../../domain/text";
import { idadeFromISO, isoToBR } from "../../domain/dates";
import { matrizEpiParaColaborador } from "../../domain/matriz";
import { divergenciaEpiPara } from "./lib/epiUtils";
import { RegistrarEntregaEpiModal } from "./RegistrarEntregaEpiModal";
import type { RegistrarEntregaEpiPayload } from "./RegistrarEntregaEpiModal";
import { EntregaAssinaturaControls } from "./EntregaAssinaturaControls";
import styles from "./EpiFichaDrawer.module.css";

interface EpiFichaDrawerProps {
  colabId: number;
  onClose: () => void;
}

export function EpiFichaDrawer({ colabId, onClose }: EpiFichaDrawerProps) {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [showEntregaModal, setShowEntregaModal] = useState(false);

  const colaborador = state.colaboradores.find((c) => c.id === colabId);
  const matrizEpi = useMemo(() => portalRepository.getMatrizEpi(), []);
  const epiCatalogo = useMemo(() => portalRepository.getEpiCatalogo(), []);

  const entregas = useMemo(
    () =>
      state.entregas
        .filter((e) => e.colabId === colabId)
        .slice()
        .sort((a, b) => b.ts.localeCompare(a.ts)),
    [state.entregas, colabId],
  );

  if (!colaborador) {
    return (
      <Drawer title="Ficha do colaborador" onClose={onClose}>
        <div className={styles.notFound}>Colaborador não encontrado.</div>
      </Drawer>
    );
  }

  const mandatorios = matrizEpiParaColaborador(colaborador, matrizEpi);
  const divergencia = divergenciaEpiPara(colaborador, matrizEpi, state.entregas);
  const idade = idadeFromISO(colaborador.nascimento);

  function handleRegistrarEntrega(payload: RegistrarEntregaEpiPayload) {
    if (!user) return;
    dispatch({
      type: "REGISTRAR_ENTREGA_EPI",
      colabId,
      epi: payload.epi,
      qtd: payload.qtd,
      ca: payload.ca,
      fornecedor: payload.fornecedor,
      valorUnit: payload.valorUnit,
      dataEntrega: payload.dataEntrega,
      dataTroca: payload.dataTroca,
      obs: payload.obs,
      by: user.email,
    });
  }

  function handleFichaGerada(entregaId: string) {
    dispatch({ type: "MARCAR_FICHA_EPI_GERADA", entregaId });
  }

  function handleAnexarAssinatura(entregaId: string, fileName: string, fileDataUrl: string, mime: string) {
    if (!user) return;
    dispatch({ type: "ANEXAR_FICHA_EPI_ASSINADA", entregaId, fileName, fileDataUrl, mime, by: user.email });
  }

  return (
    <Drawer title="Ficha do colaborador" subtitle={titleCase(colaborador.nome)} onClose={onClose} width={520}>
      <div className={styles.header}>
        <Avatar iniciais={iniciais(colaborador.nome)} size={52} />
        <div>
          <div className={styles.nome}>{titleCase(colaborador.nome)}</div>
          <div className={styles.cargo}>
            {colaborador.cargo ? titleCase(colaborador.cargo) : "—"} · {deptName(colaborador.departamento)}
          </div>
        </div>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>CPF</div>
          <div className={`${styles.infoValue} mono`}>{maskCpf(colaborador.cpf)}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Nascimento</div>
          <div className={`${styles.infoValue} mono`}>{isoToBR(colaborador.nascimento)}</div>
        </div>
        <div className={styles.infoItem}>
          <div className={styles.infoLabel}>Idade</div>
          <div className={styles.infoValue}>{idade != null ? `${idade} anos` : "—"}</div>
        </div>
      </div>

      {canEdit ? (
        <Button onClick={() => setShowEntregaModal(true)} className={styles.registrarButton}>
          <PackagePlus size={15} /> Registrar entrega de EPI
        </Button>
      ) : null}

      {divergencia.semEntrega.length > 0 ? (
        <div className={styles.bannerDanger}>
          <TriangleAlert size={16} />
          <div>
            <strong>
              Divergência: {divergencia.semEntrega.length} EPI{divergencia.semEntrega.length > 1 ? "s" : ""} obrigatório
              {divergencia.semEntrega.length > 1 ? "s" : ""} sem entrega registrada
            </strong>
            <ul className={styles.bannerList}>
              {divergencia.semEntrega.map((epi) => (
                <li key={epi}>{epi}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : mandatorios.length > 0 ? (
        <div className={styles.bannerSuccess}>
          <CircleCheck size={16} />
          <span>Todos os EPIs obrigatórios da função possuem entrega registrada.</span>
        </div>
      ) : null}

      <div className={styles.sectionTitle}>Histórico de entregas ({entregas.length})</div>
      {entregas.length === 0 ? (
        <div className={styles.emptyInline}>Nenhuma entrega registrada para este colaborador ainda.</div>
      ) : (
        <div className={styles.entregaList}>
          {entregas.map((e) => (
            <div key={e.id} className={styles.entregaCard}>
              <div className={styles.entregaHeader}>
                <strong>{e.epi}</strong>
                <span className="mono">{e.dataEntrega}</span>
              </div>
              <div className={styles.entregaMeta}>
                CA {e.ca || "—"} · Qtd {e.qtd} · {e.fornecedor || "Fornecedor não informado"}
              </div>
              <div className={styles.entregaMeta}>
                {fmtMoney(e.valorUnit)} / un · Troca prevista: <span className="mono">{e.dataTroca || "—"}</span>
              </div>
              {e.obs ? <div className={styles.entregaObs}>{e.obs}</div> : null}
              <div className={styles.entregaResp}>Registrado por {e.responsavel}</div>
              <div className={styles.entregaFicha}>
                <EntregaAssinaturaControls
                  entrega={e}
                  colaborador={colaborador}
                  canEdit={canEdit}
                  onFichaGerada={() => handleFichaGerada(e.id)}
                  onAnexarAssinatura={(fileName, fileDataUrl, mime) => handleAnexarAssinatura(e.id, fileName, fileDataUrl, mime)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {showEntregaModal ? (
        <RegistrarEntregaEpiModal
          colaboradorNome={titleCase(colaborador.nome)}
          epiOptions={mandatorios}
          epiPrecos={state.epiPrecos}
          epiCatalogo={epiCatalogo}
          onClose={() => setShowEntregaModal(false)}
          onSave={handleRegistrarEntrega}
        />
      ) : null}
    </Drawer>
  );
}
