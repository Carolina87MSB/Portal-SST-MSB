import { useMemo, useState } from "react";
import { FileText, Paperclip, Plus, UserMinus } from "lucide-react";
import { Avatar, Button, Drawer, StatusBadge } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { usePortalStore } from "../../store/PortalStoreContext";
import { portalRepository } from "../../repositories/portalRepository";
import { colaboradoresRepository } from "../../repositories/colaboradoresRepository";
import { statusDoRegistro, toneForStatus } from "../../domain/exameStatus";
import { deptName, fmtMoney, iniciais, maskCpf, titleCase } from "../../domain/text";
import { idadeFromISO, isoToBR } from "../../domain/dates";
import { todosOsCargos } from "./lib/exameUtils";
import { AnexarExameModal } from "./AnexarExameModal";
import type { AnexarExamePayload } from "./AnexarExameModal";
import { DesligarColaboradorModal } from "./DesligarColaboradorModal";
import shared from "./ExamesShared.module.css";
import styles from "./ExameFichaDrawer.module.css";

interface ExameFichaDrawerProps {
  colabId: number;
  onClose: () => void;
}

export function ExameFichaDrawer({ colabId, onClose }: ExameFichaDrawerProps) {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [anexarProc, setAnexarProc] = useState<string | undefined | null>(null);
  const [desligarOpen, setDesligarOpen] = useState(false);

  const colaborador = state.colaboradores.find((c) => c.id === colabId);
  const desligamento = state.desligados[colabId];

  const cargosOcupacionais = useMemo(
    () => todosOsCargos(portalRepository.getMatrizOcupacional().cargos, state.matrizAdd),
    [state.matrizAdd],
  );

  const attachments = useMemo(
    () =>
      state.attachments
        .filter((a) => a.colabId === colabId)
        .slice()
        .sort((a, b) => b.ts.localeCompare(a.ts)),
    [state.attachments, colabId],
  );

  if (!colaborador) {
    return (
      <Drawer title="Ficha do colaborador" onClose={onClose}>
        <div className={styles.notFound}>Colaborador não encontrado.</div>
      </Drawer>
    );
  }

  const idade = idadeFromISO(colaborador.nascimento);

  function handleAnexar(payload: AnexarExamePayload) {
    if (!user) return;
    dispatch({
      type: "ANEXAR_EXAME",
      colabId: payload.colabId,
      proc: payload.proc,
      dataISO: payload.dataISO,
      proximo: payload.proximo,
      fornecedor: payload.fornecedor,
      valor: payload.valor,
      fileName: payload.fileName,
      fileDataUrl: payload.fileDataUrl,
      by: user.email,
    });
  }

  /** Anexo mais recente para um exame específico deste colaborador (se houver). */
  function attachmentFor(proc: string) {
    return attachments.find((a) => a.proc === proc);
  }

  async function handleDesligar(dataIso: string, motivo: string) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const result = await colaboradoresRepository.desligarColaborador(colabId, dataIso, motivo);
    if (!result.ok) return result;
    dispatch({ type: "DESLIGAR_COLABORADOR", colabId, date: isoToBR(dataIso), motivo, by: user.email });
    return { ok: true as const };
  }

  return (
    <Drawer title="Ficha do colaborador" subtitle={titleCase(colaborador.nome)} onClose={onClose} width={540}>
      <div className={styles.header}>
        <Avatar iniciais={iniciais(colaborador.nome)} size={52} tone={desligamento ? "purple" : "brand"} />
        <div>
          <div className={styles.nome}>{titleCase(colaborador.nome)}</div>
          <div className={styles.cargo}>
            {colaborador.cargo ? titleCase(colaborador.cargo) : "—"} · {deptName(colaborador.departamento)}
          </div>
          {desligamento ? (
            <div className={styles.desligadoBadge}>
              <StatusBadge label={`Desligado em ${desligamento.date}`} tone="danger" />
            </div>
          ) : null}
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

      {canEdit && !desligamento ? (
        <div className={styles.actionsRow}>
          <Button onClick={() => setAnexarProc(undefined)}>
            <Plus size={15} /> Anexar exame
          </Button>
          <Button variant="danger" onClick={() => setDesligarOpen(true)}>
            <UserMinus size={15} /> Desligar colaborador
          </Button>
        </div>
      ) : null}

      <div className={styles.sectionTitle}>Exames ocupacionais ({colaborador.exames.length})</div>
      {colaborador.exames.length === 0 ? (
        <div className={styles.emptyInline}>Nenhum exame ocupacional registrado para este colaborador.</div>
      ) : (
        <div>
          {colaborador.exames.map((exame) => {
            const status = statusDoRegistro(exame);
            const podeAnexar = canEdit && !desligamento && status !== "Em dia" && status !== "A vencer";
            const anexo = attachmentFor(exame.proc);
            return (
              <div key={exame.proc} className={styles.examRow}>
                <div className={styles.examInfo}>
                  <div className={styles.examProc}>{exame.proc}</div>
                  <div className={`${styles.examDates} mono`}>
                    Último: {exame.ultimo || "—"} · Próximo: {exame.proximo || "—"}
                  </div>
                </div>
                <div className={styles.examRight}>
                  <StatusBadge label={status} tone={toneForStatus(status)} />
                  {anexo ? (
                    anexo.fileDataUrl ? (
                      <a
                        href={anexo.fileDataUrl}
                        download={anexo.fileName || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.docLink}
                        title={`Documento: ${anexo.fileName || "arquivo anexado"}`}
                      >
                        <FileText size={13} />
                      </a>
                    ) : (
                      <span className={styles.docLink} title={`Documento: ${anexo.fileName || "sem nome de arquivo"} (conteúdo não capturado)`}>
                        <FileText size={13} />
                      </span>
                    )
                  ) : null}
                  {podeAnexar ? (
                    <button type="button" className={shared.iconButton} title="Anexar exame" onClick={() => setAnexarProc(exame.proc)}>
                      <Paperclip size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.sectionTitle}>Anexos / comprovantes ({attachments.length})</div>
      {attachments.length === 0 ? (
        <div className={styles.emptyInline}>Nenhum anexo registrado para este colaborador ainda.</div>
      ) : (
        <div>
          {attachments.map((a) => (
            <div key={a.id} className={styles.attachCard}>
              <div className={styles.attachHeader}>
                <span>{a.proc}</span>
                <span className="mono">{fmtMoney(a.valor)}</span>
              </div>
              <div className={styles.attachMeta}>
                Realizado em <span className="mono">{a.dataISO}</span> · {a.fornecedor || "Fornecedor não informado"}
              </div>
              <div className={styles.attachMeta}>
                {a.fileName ? (
                  a.fileDataUrl ? (
                    <a href={a.fileDataUrl} download={a.fileName} target="_blank" rel="noreferrer" className={styles.attachFileLink}>
                      <FileText size={12} /> {a.fileName}
                    </a>
                  ) : (
                    a.fileName
                  )
                ) : (
                  "Sem arquivo anexado"
                )}{" "}
                · lançado por {a.responsavel} em {a.ts}
              </div>
            </div>
          ))}
        </div>
      )}

      {anexarProc !== null ? (
        <AnexarExameModal
          colaboradores={[colaborador]}
          cargosOcupacionais={cargosOcupacionais}
          examePrecos={state.examePrecos}
          initialColabId={colabId}
          initialProc={anexarProc}
          onClose={() => setAnexarProc(null)}
          onSave={handleAnexar}
        />
      ) : null}

      {desligarOpen ? (
        <DesligarColaboradorModal colaboradorNome={titleCase(colaborador.nome)} onClose={() => setDesligarOpen(false)} onConfirm={handleDesligar} />
      ) : null}
    </Drawer>
  );
}
