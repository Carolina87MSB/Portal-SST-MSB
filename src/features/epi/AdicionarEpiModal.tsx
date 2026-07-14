import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, TextInput } from "../../components/ui/Field";

interface AdicionarEpiModalProps {
  nomesExistentes: string[];
  onClose: () => void;
  onSave: (equip: string, valor: number, fornecedor: string, dataCotacaoIso: string) => void;
}

/** Cadastro de um novo EPI diretamente no catálogo de Custos & valores — não
 * depende de a matriz de EPI por função já exigir o equipamento; a demanda
 * simplesmente aparece como 0 até algum cargo passar a exigi-lo. */
export function AdicionarEpiModal({ nomesExistentes, onClose, onSave }: AdicionarEpiModalProps) {
  const [equip, setEquip] = useState("");
  const [valorInput, setValorInput] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [dataCotacao, setDataCotacao] = useState("");

  const nomeNormalizado = equip.trim().toLocaleLowerCase("pt-BR");
  const jaExiste = nomeNormalizado.length > 0 && nomesExistentes.some((n) => n.toLocaleLowerCase("pt-BR") === nomeNormalizado);
  const valorNumerico = Number(String(valorInput).replace(",", ".")) || 0;
  const canSubmit = equip.trim().length > 0 && !jaExiste && valorNumerico > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSave(equip.trim(), valorNumerico, fornecedor.trim(), dataCotacao);
    onClose();
  }

  return (
    <Modal
      title="Adicionar novo EPI"
      subtitle="Cadastro manual — passa a aparecer no catálogo de Custos & valores"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            Adicionar EPI
          </Button>
        </>
      }
    >
      <LabeledField label="Nome do equipamento">
        <TextInput value={equip} onChange={(e) => setEquip(e.target.value)} placeholder="Ex.: Capacete de Segurança" autoFocus />
      </LabeledField>
      {jaExiste ? (
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger, #99413a)", marginTop: -6 }}>
          Já existe um EPI com esse nome no catálogo.
        </div>
      ) : null}
      <LabeledField label="Valor unitário (R$)">
        <TextInput inputMode="decimal" value={valorInput} onChange={(e) => setValorInput(e.target.value)} placeholder="0,00" />
      </LabeledField>
      <LabeledField label="Fornecedor (opcional)">
        <TextInput value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome do fornecedor" />
      </LabeledField>
      <LabeledField label="Data da cotação (opcional)">
        <TextInput type="date" value={dataCotacao} onChange={(e) => setDataCotacao(e.target.value)} />
      </LabeledField>
    </Modal>
  );
}
