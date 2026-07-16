import { useMemo, useState } from "react";
import { FileText, Paperclip, Plus, UserMinus } from "lucide-react";
import { Avatar, Button, Drawer, StatusBadge } from "../../components/ui";
import { useAuth } from "../../auth/AuthContext";
import { usePortalStore } from "../../store/PortalStoreContext";
import { portalRepository } from "../../repositories/portalRepository";
import { colaboradoresRepository } from "../../repositories/colaboradoresRepository";
import { removerDesligamentoPendente } from "../../repositories/desligamentoPendenteRepository";
import { anexarExame, getAnexoSignedUrl } from "../../repositories/anexosExamesRepository";
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
  /** Quando aberto a partir da notificação "Desligamento pendente" do Dashboard, já mostra
   * a tela de confirmação de desligamento pré-preenchida com o que veio do PeopleFlow. */
  abrirDesligarPendente?: { dataIso: string; motivo: string };
}

export function ExameFichaDrawer({ colabId, onClose, abrirDesligarPendente }: ExameFichaDrawerProps) {
  const { user, canEdit } = useAuth();
  const { state, dispatch } = usePortalStore();
  const [anexarProc, setAnexarProc] = useState<string | undefined | null>(null);
  const [anexarTipo, setAnexarTipo] = useState<string | undefined>(undefined);
  const [desligarOpen, setDesligarOpen] = useState(Boolean(abrirDesligarPendente));
  const [abrindoPath, setAbrindoPath] = useState<string | null>(null);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);

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

  async function handleAnexar(payload: AnexarExamePayload) {
    if (!user) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const result = await anexarExame({
      colabId: payload.colabId,
      proc: payload.proc,
      dataISO: payload.dataISO,
      proximo: payload.proximo,
      fornecedor: payload.fornecedor,
      valor: payload.valor,
      file: payload.file,
      by: user.email,
    });
    if (!result.ok) return result;
    dispatch({ type: "ANEXAR_EXAME", anexo: result.anexo, proximo: payload.proximo, by: user.email });
    return { ok: true as const };
  }

  /** Anexo mais recente para um exame específico deste colaborador (se houver). */
  function attachmentFor(proc: string) {
    return attachments.find((a) => a.proc === proc);
  }

  async function handleAbrirAnexo(storagePath: string) {
    if (abrindoPath) return;
    // Abre a aba em branco já dentro do gesto de clique (senão bloqueadores de
    // pop-up derrubam a chamada depois do await) e só preenche a URL quando a
    // signed URL chega.
    const janela = window.open("", "_blank", "noopener,noreferrer");
    setAbrindoPath(storagePath);
    setErroAnexo(null);
    const url = await getAnexoSignedUrl(storagePath);
    setAbrindoPath(null);
    if (url && janela) janela.location.href = url;
    else {
      janela?.close();
      setErroAnexo("Falha ao gerar o link do arquivo — tente novamente.");
    }
  }

  async function handleDesligar(dataIso: string, motivo: string, precisaExameDemissional: boolean) {
    if (!user || !colaborador) return { ok: false as const, error: "Sessão expirada — faça login novamente." };
    const result = await colaboradoresRepository.desligarColaborador(colabId, dataIso, motivo);
    if (!result.ok) return result;
    dispatch({ type: "DESLIGAR_COLABORADOR", colabId, date: isoToBR(dataIso), motivo, by: user.email });
    if (abrirDesligarPendente) {
      // Efetivação de uma solicitação vinda do PeopleFlow — encerra a pendência
      // para não continuar aparecendo no Dashboard.
      dispatch({ type: "REMOVER_DESLIGAMENTO_PENDENTE", colaboradorNome: colaborador.nome });
      removerDesligamentoPendente(colaborador.nome).catch(() => {
        // já foi removido do estado local; se o delete remoto falhar, a linha só reaparece
        // no próximo carregamento — sem impacto no fluxo que o usuário já concluiu.
      });
    }
    if (precisaExameDemissional) {
      // Abre o anexo de exame já com o tipo "Demissional" pré-selecionado — o exame
      // específico (proc) continua livre, pois depende da matriz do cargo.
      setAnexarTipo("Demissional");
      setAnexarProc(undefined);
    }
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
          <Button
            onClick={() => {
              setAnexarTipo(undefined);
              setAnexarProc(undefined);
            }}
          >
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
                    anexo.storagePath ? (
                      <button
                        type="button"
                        className={styles.docLink}
                        disabled={abrindoPath === anexo.storagePath}
                        onClick={() => handleAbrirAnexo(anexo.storagePath!)}
                        title={`Documento: ${anexo.fileName || "arquivo anexado"}`}
                      >
                        <FileText size={13} />
                      </button>
                    ) : (
                      <span className={styles.docLink} title={`Documento: ${anexo.fileName || "sem nome de arquivo"} (sem arquivo anexado)`}>
                        <FileText size={13} />
                      </span>
                    )
                  ) : null}
                  {podeAnexar ? (
                    <button
                      type="button"
                      className={shared.iconButton}
                      title="Anexar exame"
                      onClick={() => {
                        setAnexarTipo(undefined);
                        setAnexarProc(exame.proc);
                      }}
                    >
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
                  a.storagePath ? (
                    <button
                      type="button"
                      className={styles.attachFileLink}
                      disabled={abrindoPath === a.storagePath}
                      onClick={() => handleAbrirAnexo(a.storagePath!)}
                    >
                      <FileText size={12} /> {a.fileName}
                    </button>
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

      {erroAnexo ? (
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)" }}>{erroAnexo}</div>
      ) : null}

      {anexarProc !== null ? (
        <AnexarExameModal
          colaboradores={[colaborador]}
          cargosOcupacionais={cargosOcupacionais}
          examePrecos={state.examePrecos}
          initialColabId={colabId}
          initialProc={anexarProc}
          initialTipo={anexarTipo}
          onClose={() => {
            setAnexarProc(null);
            setAnexarTipo(undefined);
          }}
          onSave={handleAnexar}
        />
      ) : null}

      {desligarOpen ? (
        <DesligarColaboradorModal
          colaboradorNome={titleCase(colaborador.nome)}
          initialDataIso={abrirDesligarPendente?.dataIso}
          initialMotivo={abrirDesligarPendente?.motivo}
          onClose={() => setDesligarOpen(false)}
          onConfirm={handleDesligar}
        />
      ) : null}
    </Drawer>
  );
}
