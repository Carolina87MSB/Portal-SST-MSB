import { useState } from "react";
import type { ChangeEvent } from "react";
import { useRef } from "react";
import { FileDown, FileText, Upload } from "lucide-react";
import { StatusBadge } from "../../components/ui";
import type { Colaborador, EntregaEpi, FichaEntregaEpi } from "../../types/domain";
import { baixarFichaEntregaEpiPdf } from "../../domain/pdf/fichaEntregaEpi";
import { labelStatusFichaEpi, statusFichaEpi, toneStatusFichaEpi } from "../../domain/fichaAssinatura";
import { getFichaSignedUrl } from "../../repositories/fichasEpiRepository";
import styles from "./FichaEpiControls.module.css";

interface FichaEpiControlsProps {
  ficha: FichaEntregaEpi;
  entregas: EntregaEpi[];
  colaborador: Colaborador | undefined;
  canEdit: boolean;
  onAnexarAssinatura: (file: File) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Controles de uma ficha de entrega já gerada — reabrir o PDF, anexar/ver a via assinada. */
export function FichaEpiControls({ ficha, entregas, colaborador, canEdit, onAnexarAssinatura }: FichaEpiControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const status = statusFichaEpi(ficha);

  function handleVerPdf() {
    if (!colaborador) return;
    baixarFichaEntregaEpiPdf(entregas, colaborador, ficha);
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEnviando(true);
    setErro(null);
    const result = await onAnexarAssinatura(file);
    setEnviando(false);
    if (!result.ok) setErro(result.error);
  }

  async function handleVerAssinada() {
    if (!ficha.assinaturaStoragePath || abrindo) return;
    // Abre a aba em branco já dentro do gesto de clique (senão bloqueadores de
    // pop-up derrubam a chamada depois do await) e só preenche a URL quando a
    // signed URL chega.
    const janela = window.open("", "_blank", "noopener,noreferrer");
    setAbrindo(true);
    const url = await getFichaSignedUrl(ficha.assinaturaStoragePath);
    setAbrindo(false);
    if (url && janela) janela.location.href = url;
    else {
      janela?.close();
      setErro("Falha ao gerar o link do arquivo — tente novamente.");
    }
  }

  return (
    <div className={styles.wrap}>
      <StatusBadge label={labelStatusFichaEpi(status)} tone={toneStatusFichaEpi(status)} />
      <button type="button" className={styles.actionButton} title="Gerar novamente o PDF desta ficha" onClick={handleVerPdf} disabled={!colaborador}>
        <FileDown size={12} /> Ver ficha (PDF)
      </button>
      {canEdit && status === "aguardando" ? (
        <>
          <button
            type="button"
            className={styles.actionButton}
            title="Anexar ficha assinada"
            onClick={() => fileInputRef.current?.click()}
            disabled={enviando}
          >
            <Upload size={12} /> {enviando ? "Enviando..." : "Anexar ficha assinada"}
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
      {ficha.assinaturaStoragePath ? (
        <button
          type="button"
          className={styles.viewLink}
          onClick={handleVerAssinada}
          disabled={abrindo}
          title={`Ver ${ficha.assinaturaFileName || "ficha assinada"}`}
        >
          <FileText size={12} /> {abrindo ? "Abrindo..." : "Ver ficha assinada"}
        </button>
      ) : null}
      {erro ? <span className={styles.erro}>{erro}</span> : null}
    </div>
  );
}
