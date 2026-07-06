import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, TextInput } from "../../components/ui/Field";
import type { CargoOcupacional } from "../../types/domain";

interface AdicionarCargoModalProps {
  onClose: () => void;
  onSave: (cargo: CargoOcupacional) => void;
}

/** Cadastro mínimo de um novo cargo na matriz ocupacional — riscos/EPIs/exames detalhados ficam
 * para uma etapa futura de autoria completa; aqui o RH apenas registra a existência do cargo. */
export function AdicionarCargoModal({ onClose, onSave }: AdicionarCargoModalProps) {
  const [nome, setNome] = useState("");
  const [cbo, setCbo] = useState("");
  const [ambiente, setAmbiente] = useState("");

  const canSubmit = nome.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSave({
      nome: nome.trim(),
      cbo: cbo.trim(),
      ambiente: ambiente.trim() || "Sem classificação",
      riscos: [],
      epis: [],
      exames: [],
    });
    onClose();
  }

  return (
    <Modal
      title="Adicionar cargo à matriz ocupacional"
      subtitle="Cadastro mínimo — riscos, EPIs e exames podem ser detalhados posteriormente pelo PCMSO/PGR"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            Adicionar cargo
          </Button>
        </>
      }
    >
      <LabeledField label="Nome do cargo">
        <TextInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Auxiliar de Enfermagem" autoFocus />
      </LabeledField>
      <LabeledField label="CBO">
        <TextInput value={cbo} onChange={(e) => setCbo(e.target.value)} placeholder="Ex.: 3222-05" />
      </LabeledField>
      <LabeledField label="Ambiente">
        <TextInput value={ambiente} onChange={(e) => setAmbiente(e.target.value)} placeholder="Ex.: Administrativo, Hospitalar..." />
      </LabeledField>
    </Modal>
  );
}
