import { useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, Select, TextInput } from "../../components/ui/Field";
import { isoToBR } from "../../domain/dates";
import type { EpiCatalogoItem, PrecoInfo } from "../../types/domain";

const OUTRO_VALUE = "__outro__";

export interface RegistrarEntregaEpiPayload {
  epi: string;
  qtd: number;
  ca: string;
  fornecedor: string;
  valorUnit: number;
  dataEntrega: string;
  dataTroca: string;
  obs: string;
}

interface RegistrarEntregaEpiModalProps {
  colaboradorNome: string;
  epiOptions: string[];
  epiPrecos: Record<string, PrecoInfo>;
  epiCatalogo: EpiCatalogoItem[];
  onClose: () => void;
  onSave: (payload: RegistrarEntregaEpiPayload) => void;
}

/** Modal de registro de entrega de EPI a partir da ficha do colaborador. */
export function RegistrarEntregaEpiModal({
  colaboradorNome,
  epiOptions,
  epiPrecos,
  epiCatalogo,
  onClose,
  onSave,
}: RegistrarEntregaEpiModalProps) {
  const [epiSelecionado, setEpiSelecionado] = useState(epiOptions[0] ?? OUTRO_VALUE);
  const [epiCustom, setEpiCustom] = useState("");
  const [qtd, setQtd] = useState("1");
  const [ca, setCa] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [valorUnit, setValorUnit] = useState("");
  const [dataEntregaIso, setDataEntregaIso] = useState("");
  const [dataTrocaIso, setDataTrocaIso] = useState("");
  const [obs, setObs] = useState("");

  const epiFinal = epiSelecionado === OUTRO_VALUE ? epiCustom.trim() : epiSelecionado;

  const valorSugerido = useMemo(() => {
    if (!epiFinal) return null;
    return epiPrecos[epiFinal]?.valor ?? epiCatalogo.find((c) => c.equip === epiFinal)?.valor ?? null;
  }, [epiFinal, epiPrecos, epiCatalogo]);

  function handleSelectEpi(value: string) {
    setEpiSelecionado(value);
    if (value !== OUTRO_VALUE) {
      const sugerido = epiPrecos[value]?.valor ?? epiCatalogo.find((c) => c.equip === value)?.valor;
      if (sugerido != null) setValorUnit(String(sugerido));
      const fornecedorSugerido = epiPrecos[value]?.fornecedor;
      if (fornecedorSugerido) setFornecedor(fornecedorSugerido);
    }
  }

  const qtdNumerica = Number(qtd) || 0;
  const valorNumerico = Number(String(valorUnit).replace(",", ".")) || 0;
  const canSubmit = epiFinal.length > 0 && qtdNumerica > 0 && dataEntregaIso.length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSave({
      epi: epiFinal,
      qtd: qtdNumerica,
      ca: ca.trim(),
      fornecedor: fornecedor.trim(),
      valorUnit: valorNumerico,
      dataEntrega: isoToBR(dataEntregaIso),
      dataTroca: dataTrocaIso ? isoToBR(dataTrocaIso) : "—",
      obs: obs.trim(),
    });
    onClose();
  }

  return (
    <Modal
      title="Registrar entrega de EPI"
      subtitle={colaboradorNome}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            Registrar entrega
          </Button>
        </>
      }
    >
      <LabeledField label="EPI">
        <Select
          options={[
            ...epiOptions.map((epi) => ({ value: epi, label: epi })),
            { value: OUTRO_VALUE, label: "+ Outro (informar manualmente)" },
          ]}
          value={epiSelecionado}
          onChange={(e) => handleSelectEpi(e.target.value)}
        />
      </LabeledField>

      {epiSelecionado === OUTRO_VALUE ? (
        <LabeledField label="Nome do EPI">
          <TextInput value={epiCustom} onChange={(e) => setEpiCustom(e.target.value)} placeholder="Ex.: Luva de raspa" autoFocus />
        </LabeledField>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LabeledField label="Quantidade">
          <TextInput type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </LabeledField>
        <LabeledField label="CA (certificado)">
          <TextInput value={ca} onChange={(e) => setCa(e.target.value)} placeholder="Nº do CA" />
        </LabeledField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LabeledField label="Fornecedor">
          <TextInput value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome do fornecedor" />
        </LabeledField>
        <LabeledField label="Valor unitário (R$)" hint={valorSugerido != null ? `Sugerido: R$ ${valorSugerido.toFixed(2)}` : undefined}>
          <TextInput inputMode="decimal" value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} placeholder="0,00" />
        </LabeledField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LabeledField label="Data de entrega">
          <TextInput type="date" value={dataEntregaIso} onChange={(e) => setDataEntregaIso(e.target.value)} />
        </LabeledField>
        <LabeledField label="Data de troca prevista">
          <TextInput type="date" value={dataTrocaIso} onChange={(e) => setDataTrocaIso(e.target.value)} />
        </LabeledField>
      </div>

      <LabeledField label="Observações">
        <TextInput value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
      </LabeledField>
    </Modal>
  );
}
