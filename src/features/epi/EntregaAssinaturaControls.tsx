import { useRef } from "react";
import type { ChangeEvent } from "react";
import { FileDown, FileText, Upload } from "lucide-react";
import { StatusBadge } from "../../components/ui";
import type { Colaborador, EntregaEpi } from "../../types/domain";
import { baixarFichaEntregaEpiPdf } from "../../domain/pdf/fichaEntregaEpi";
import { labelStatusAssinatura, statusAssinaturaFor, toneStatusAssinatura } from "../../domain/fichaAssinatura";
import styles from "./EntregaAssinaturaControls.module.css";

interface EntregaAssinaturaControlsProps {
  entrega: EntregaEpi;
  colaborador: Colaborador | undefined;
  canEdit: boolean;
  onFichaGerada: () => void;
  onAnexarAssinatura: (fileName: string, fileDataUrl: string, mime: string) => void;
}

/** Controles de ficha de entrega (gerar PDF / anexar via assinada) — usado na ficha do
 * colaborador e no Histórico de entregas, sempre com a mesma lógica e o mesmo status. */
export function EntregaAssinaturaControls({
  entrega,
  colaborador,
  canEdit,
  onFichaGerada,
  onAnexarAssinatura,
}: EntregaAssinaturaControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const status = statusAssinaturaFor(entrega);

  function handleGerarPdf() {
    if (!colaborador) return;
    baixarFichaEntregaEpiPdf(entrega, colaborador);
    onFichaGerada();
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onAnexarAssinatura(file.name, reader.result, file.type);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={styles.wrap}>
      <StatusBadge label={labelStatusAssinatura(status)} tone={toneStatusAssinatura(status)} />
      <button
        type="button"
        className={styles.actionButton}
        title="Gerar ficha de entrega em PDF"
        onClick={handleGerarPdf}
        disabled={!colaborador}
      >
        <FileDown size={12} /> Gerar ficha (PDF)
      </button>
      {canEdit ? (
        <>
          <button type="button" className={styles.actionButton} title="Anexar ficha assinada" onClick={() => fileInputRef.current?.click()}>
            <Upload size={12} /> Anexar ficha assinada
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className={styles.hiddenInput}
            onChange={handleFileSelected}
          />
        </>
      ) : null}
      {entrega.assinaturaDataUrl ? (
        <a
          href={entrega.assinaturaDataUrl}
          download={entrega.assinaturaFileName || undefined}
          target="_blank"
          rel="noreferrer"
          className={styles.viewLink}
          title={`Ver ${entrega.assinaturaFileName || "ficha assinada"}`}
        >
          <FileText size={12} /> Ver ficha assinada
        </a>
      ) : null}
    </div>
  );
}
