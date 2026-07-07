import { FileDown, FileText } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { baixarFichaEntregaEpiPdf } from "../../domain/pdf/fichaEntregaEpi";
import { codigoFichaEpi } from "../../domain/fichaAssinatura";
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

  return (
    <Modal title="Fichas de EPI assinadas" subtitle={colaboradorNome} onClose={onClose} width={560}>
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
                  {ficha.assinaturaDataUrl ? (
                    <a
                      href={ficha.assinaturaDataUrl}
                      download={ficha.assinaturaFileName || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.viewLink}
                    >
                      <FileText size={12} /> Ver ficha assinada
                    </a>
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
