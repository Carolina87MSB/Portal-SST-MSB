import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, TextInput } from "../../components/ui/Field";
import { isoToBR } from "../../domain/dates";

interface DesligarColaboradorModalProps {
  colaboradorNome: string;
  onClose: () => void;
  onConfirm: (dateBR: string, motivo: string) => void;
}

/** Confirmação de desligamento — a partir deste ponto o colaborador some das listas ativas do portal. */
export function DesligarColaboradorModal({ colaboradorNome, onClose, onConfirm }: DesligarColaboradorModalProps) {
  const [dataIso, setDataIso] = useState("");
  const [motivo, setMotivo] = useState("");

  const canSubmit = dataIso.length > 0 && motivo.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onConfirm(isoToBR(dataIso), motivo.trim());
    onClose();
  }

  return (
    <Modal
      title="Desligar colaborador"
      subtitle={colaboradorNome}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" disabled={!canSubmit} onClick={handleSubmit}>
            Confirmar desligamento
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 12.5, color: "var(--color-muted)", lineHeight: 1.6, marginBottom: 4 }}>
        Ao confirmar, este colaborador deixa de aparecer nas listas ativas de exames em todo o portal e passa a constar apenas na aba
        Desligados, com seu histórico preservado.
      </div>
      <LabeledField label="Data de desligamento">
        <TextInput type="date" value={dataIso} onChange={(e) => setDataIso(e.target.value)} />
      </LabeledField>
      <LabeledField label="Motivo">
        <TextInput value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: Pedido de demissão, término de contrato..." />
      </LabeledField>
    </Modal>
  );
}
