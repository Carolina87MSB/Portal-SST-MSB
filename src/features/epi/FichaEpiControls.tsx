import { useRef } from "react";
import type { ChangeEvent } from "react";
import { FileDown, FileText, Upload } from "lucide-react";
import { StatusBadge } from "../../components/ui";
import type { Colaborador, EntregaEpi, FichaEntregaEpi } from "../../types/domain";
import { baixarFichaEntregaEpiPdf } from "../../domain/pdf/fichaEntregaEpi";
import { labelStatusFichaEpi, statusFichaEpi, toneStatusFichaEpi } from "../../domain/fichaAssinatura";
import styles from "./FichaEpiControls.module.css";

interface FichaEpiControlsProps {
  ficha: FichaEntregaEpi;
  entregas: EntregaEpi[];
  colaborador: Colaborador | undefined;
  canEdit: boolean;
  onAnexarAssinatura: (fileName: string, fileDataUrl: string, mime: string) => void;
}

/** Controles de uma ficha de entrega já gerada — reabrir o PDF, anexar/ver a via assinada. */
export function FichaEpiControls({ ficha, entregas, colaborador, canEdit, onAnexarAssinatura }: FichaEpiControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const status = statusFichaEpi(ficha);

  function handleVerPdf() {
    if (!colaborador) return;
    baixarFichaEntregaEpiPdf(entregas, colaborador, ficha);
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
      <StatusBadge label={labelStatusFichaEpi(status)} tone={toneStatusFichaEpi(status)} />
      <button type="button" className={styles.actionButton} title="Gerar novamente o PDF desta ficha" onClick={handleVerPdf} disabled={!colaborador}>
        <FileDown size={12} /> Ver ficha (PDF)
      </button>
      {canEdit && status === "aguardando" ? (
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
      {ficha.assinaturaDataUrl ? (
        <a
          href={ficha.assinaturaDataUrl}
          download={ficha.assinaturaFileName || undefined}
          target="_blank"
          rel="noreferrer"
          className={styles.viewLink}
          title={`Ver ${ficha.assinaturaFileName || "ficha assinada"}`}
        >
          <FileText size={12} /> Ver ficha assinada
        </a>
      ) : null}
    </div>
  );
}
