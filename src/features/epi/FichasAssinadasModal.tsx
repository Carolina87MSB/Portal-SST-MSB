import { useState } from "react";
import { FileDown, FileText } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { baixarFichaEntregaEpiPdf } from "../../domain/pdf/fichaEntregaEpi";
import { codigoFichaEpi } from "../../domain/fichaAssinatura";
import { getFichaSignedUrl } from "../../repositories/fichasEpiRepository";
import type { Colaborador, EntregaEpi, FichaEntregaEpi } from "../../types/domain";
import styles from "./FichasAssinadasModal.module.css";

interface FichasAssinadasModalProps {
  colaboradorNome: string;
  colaborador: Colaborador | undefined;
  fichas: FichaEntregaEpi[];
  entregas: EntregaEpi[];
  onClose: () => void;
}

/** Histórico só das fichas de entrega de EPI já assinadas deste colaborador. */
export function FichasAssinadasModal({ colaboradorNome, colaborador, fichas, entregas, onClose }: FichasAssinadasModalProps) {
  const fichasOrdenadas = fichas.slice().sort((a, b) => (b.assinaturaAnexadaEm ?? "").localeCompare(a.assinaturaAnexadaEm ?? ""));
  const [abrindoPath, setAbrindoPath] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleVerAssinada(storagePath: string) {
    if (abrindoPath) return;
    setAbrindoPath(storagePath);
    setErro(null);
    const result = await getFichaSignedUrl(storagePath);
    setAbrindoPath(null);
    if (!result.ok) {
      setErro(`Falha ao gerar o link do arquivo: ${result.error}`);
      return;
    }
    // Abre já com a URL final (nunca uma aba em branco pré-aberta) — algumas
    // combinações de navegador/PDF viewer abrem o PDF numa aba própria mesmo
    // quando se navega uma aba em branco existente, deixando essa em branco
    // órfã. Se o pop-up for bloqueado, cai para a aba atual.
    const janela = window.open(result.url, "_blank", "noopener,noreferrer");
    if (!janela) window.location.href = result.url;
  }

  return (
    <Modal title="Fichas de EPI assinadas" subtitle={colaboradorNome} onClose={onClose} width={560}>
      {erro ? <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)", marginBottom: 10 }}>{erro}</div> : null}
      {fichasOrdenadas.length === 0 ? (
        <EmptyState title="Nenhuma ficha assinada ainda" description="Assim que uma ficha de entrega for gerada e a via assinada anexada, ela aparece aqui." />
      ) : (
        <div className={styles.list}>
          {fichasOrdenadas.map((ficha) => {
            const itens = entregas.filter((e) => e.fichaId === ficha.id);
            return (
              <div key={ficha.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <strong>{itens.length} item{itens.length > 1 ? "ns" : ""}</strong>
                  <span className="mono">{ficha.assinaturaAnexadaEm}</span>
                </div>
                <div className={styles.cardMeta}>Ficha nº {codigoFichaEpi(ficha.numero)} · gerada em {ficha.geradaEm}</div>
                <div className={styles.cardMeta}>Anexada por {ficha.assinaturaResponsavel}</div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => colaborador && baixarFichaEntregaEpiPdf(itens, colaborador, ficha)}
                    disabled={!colaborador}
                  >
                    <FileDown size={12} /> Ver ficha (PDF)
                  </button>
                  {ficha.assinaturaStoragePath ? (
                    <button
                      type="button"
                      className={styles.viewLink}
                      disabled={abrindoPath === ficha.assinaturaStoragePath}
                      onClick={() => handleVerAssinada(ficha.assinaturaStoragePath!)}
                    >
                      <FileText size={12} /> Ver ficha assinada
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
