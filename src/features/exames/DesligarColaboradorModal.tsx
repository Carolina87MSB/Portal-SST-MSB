import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, TextInput } from "../../components/ui/Field";

interface DesligarColaboradorModalProps {
  colaboradorNome: string;
  onClose: () => void;
  onConfirm: (dataIso: string, motivo: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Confirmação de desligamento — a partir deste ponto o colaborador some das listas ativas do portal. */
export function DesligarColaboradorModal({ colaboradorNome, onClose, onConfirm }: DesligarColaboradorModalProps) {
  const [dataIso, setDataIso] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const canSubmit = dataIso.length > 0 && motivo.trim().length > 0 && !enviando;

  async function handleSubmit() {
    if (!canSubmit) return;
    setEnviando(true);
    setErro(null);
    const result = await onConfirm(dataIso, motivo.trim());
    setEnviando(false);
    if (!result.ok) {
      setErro(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal
      title="Desligar colaborador"
      subtitle={colaboradorNome}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="danger" disabled={!canSubmit} onClick={handleSubmit}>
            {enviando ? "Confirmando..." : "Confirmar desligamento"}
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 12.5, color: "var(--color-muted)", lineHeight: 1.6, marginBottom: 4 }}>
        Ao confirmar, este colaborador deixa de aparecer nas listas ativas de exames em todo o portal e passa a constar apenas na aba
        Desligados, com seu histórico preservado. Também passa a aparecer no Portal PeopleFlow, na aba Desligados.
      </div>
      <LabeledField label="Data de desligamento">
        <TextInput type="date" value={dataIso} onChange={(e) => setDataIso(e.target.value)} />
      </LabeledField>
      <LabeledField label="Motivo">
        <TextInput value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: Pedido de demissão, término de contrato..." />
      </LabeledField>
      {erro && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)" }}>{erro}</div>
      )}
    </Modal>
  );
}
