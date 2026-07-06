import { useState } from "react";
import { History } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { LabeledField, TextInput } from "../ui/Field";
import { fmtMoney } from "../../domain/text";
import type { PrecoHistoricoItem } from "../../types/domain";

interface PriceEditModalProps {
  title: string;
  itemLabel: string;
  valor: number;
  fornecedor: string;
  dataCotacao: string;
  historico: PrecoHistoricoItem[];
  onClose: () => void;
  onSave: (valor: number, fornecedor: string, dataCotacao: string) => void;
}

/** Modal genérico de edição de valor unitário — usado para EPI, exames e fardamento. */
export function PriceEditModal({
  title,
  itemLabel,
  valor,
  fornecedor,
  dataCotacao,
  historico,
  onClose,
  onSave,
}: PriceEditModalProps) {
  const [valorInput, setValorInput] = useState(String(valor || ""));
  const [fornecedorInput, setFornecedorInput] = useState(fornecedor);
  const [dataInput, setDataInput] = useState(dataCotacao);

  const valorNumerico = Number(String(valorInput).replace(",", ".")) || 0;
  const canSubmit = valorNumerico > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSave(valorNumerico, fornecedorInput.trim(), dataInput);
    onClose();
  }

  return (
    <Modal
      title={title}
      subtitle={itemLabel}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            Salvar valor
          </Button>
        </>
      }
    >
      <LabeledField label="Valor unitário (R$)">
        <TextInput
          inputMode="decimal"
          value={valorInput}
          onChange={(e) => setValorInput(e.target.value)}
          placeholder="0,00"
          autoFocus
        />
      </LabeledField>
      <LabeledField label="Fornecedor">
        <TextInput value={fornecedorInput} onChange={(e) => setFornecedorInput(e.target.value)} placeholder="Nome do fornecedor" />
      </LabeledField>
      <LabeledField label="Data da cotação">
        <TextInput type="date" value={dataInput} onChange={(e) => setDataInput(e.target.value)} />
      </LabeledField>

      {historico.length > 0 ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#6b54b8", marginBottom: 8 }}>
            <History size={13} /> Histórico de valores
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {historico.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#51606b",
                  background: "#f6fafb",
                  borderRadius: 8,
                  padding: "8px 12px",
                }}
              >
                <span>
                  {fmtMoney(h.valor)} {h.fornecedor ? `· ${h.fornecedor}` : ""}
                </span>
                <span style={{ color: "#a8b4ba" }}>{h.ts}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
