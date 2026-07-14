import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { LabeledField, Select, TextInput } from "../../components/ui/Field";
import { ColaboradorPicker } from "./ColaboradorPicker";
import { examesDaMatrizParaTipo } from "../../domain/matriz";
import type { ExameMatrizEntry } from "../../domain/matriz";
import { procCode } from "../../domain/exameStatus";
import { addMonthsBR, isoToBR } from "../../domain/dates";
import { titleCase } from "../../domain/text";
import { tiposAso } from "./lib/exameUtils";
import type { CargoOcupacional, Colaborador, PrecoInfo } from "../../types/domain";

export interface AnexarExamePayload {
  colabId: number;
  proc: string;
  dataISO: string; // já convertido para dd/mm/aaaa
  proximo: string; // dd/mm/aaaa
  fornecedor: string;
  valor: number;
  fileName: string;
  fileDataUrl?: string;
}

interface AnexarExameModalProps {
  colaboradores: Colaborador[];
  cargosOcupacionais: CargoOcupacional[];
  examePrecos: Record<string, PrecoInfo>;
  /** Quando informado, o colaborador vem travado (não pode ser trocado no modal). */
  initialColabId?: number;
  /** Quando informado junto de initialColabId, o exame específico também vem travado (sem seletor de tipo/exame). */
  initialProc?: string;
  /** Tipo de ASO pré-selecionado (ex.: "Demissional" ao vir do fluxo de desligamento) — o exame específico continua livre para escolha. */
  initialTipo?: string;
  onClose: () => void;
  onSave: (payload: AnexarExamePayload) => void;
}

/** Modal de lançamento de realização de exame ocupacional — usado a partir do Controle de ASO,
 * de Próximos vencimentos e da ficha do colaborador, com três níveis de pré-preenchimento. */
export function AnexarExameModal({
  colaboradores,
  cargosOcupacionais,
  examePrecos,
  initialColabId,
  initialProc,
  initialTipo,
  onClose,
  onSave,
}: AnexarExameModalProps) {
  const colabLocked = initialColabId != null;
  const procLocked = !!initialProc;

  const [colabId, setColabId] = useState<number | null>(initialColabId ?? null);
  const [tipo, setTipo] = useState<string>(initialTipo ?? tiposAso()[0] ?? "Periódico");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dataRealizadaIso, setDataRealizadaIso] = useState("");
  const [proximoBR, setProximoBR] = useState("");
  const [proximoTouched, setProximoTouched] = useState(false);
  const [fornecedor, setFornecedor] = useState("");
  const [valorInput, setValorInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileDataUrl, setFileDataUrl] = useState<string | undefined>(undefined);

  const selectedColab = useMemo(() => colaboradores.find((c) => c.id === colabId) ?? null, [colaboradores, colabId]);

  const entries = useMemo<ExameMatrizEntry[]>(
    () => (selectedColab && !procLocked ? examesDaMatrizParaTipo(selectedColab, tipo, cargosOcupacionais) : []),
    [selectedColab, tipo, cargosOcupacionais, procLocked],
  );

  useEffect(() => {
    if (procLocked) return;
    setSelectedKey(entries[0]?.key ?? null);
  }, [entries, procLocked]);

  const selectedEntry = useMemo<ExameMatrizEntry | null>(() => {
    if (!selectedColab) return null;
    if (procLocked && initialProc) {
      for (const t of tiposAso()) {
        const found = examesDaMatrizParaTipo(selectedColab, t, cargosOcupacionais).find((e) => e.procStr === initialProc);
        if (found) return found;
      }
      const existente = selectedColab.exames.find((e) => e.proc === initialProc);
      return {
        key: initialProc,
        codigo: procCode(initialProc),
        nome: initialProc.replace(/^\(\d+\)\s*/, ""),
        procStr: initialProc,
        periodicidadeMeses: 12,
        jaTem: !!existente,
        ultimoAtual: existente?.ultimo ?? "—",
      };
    }
    return entries.find((e) => e.key === selectedKey) ?? null;
  }, [selectedColab, procLocked, initialProc, cargosOcupacionais, entries, selectedKey]);

  useEffect(() => {
    if (!selectedEntry?.codigo) return;
    const preco = examePrecos[selectedEntry.codigo];
    if (!preco) return;
    setFornecedor((prev) => prev || preco.fornecedor || "");
    setValorInput((prev) => prev || (preco.valor ? String(preco.valor) : ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntry?.codigo]);

  useEffect(() => {
    if (proximoTouched || !dataRealizadaIso || !selectedEntry) return;
    setProximoBR(addMonthsBR(isoToBR(dataRealizadaIso), selectedEntry.periodicidadeMeses));
  }, [dataRealizadaIso, selectedEntry, proximoTouched]);

  const canSubmit = colabId != null && !!selectedEntry && dataRealizadaIso.length > 0 && proximoBR.trim().length > 0 && proximoBR !== "—";

  function handleSubmit() {
    if (!canSubmit || !selectedEntry || colabId == null) return;
    onSave({
      colabId,
      proc: selectedEntry.procStr,
      dataISO: isoToBR(dataRealizadaIso),
      proximo: proximoBR.trim(),
      fornecedor: fornecedor.trim(),
      valor: Number(String(valorInput).replace(",", ".")) || 0,
      fileName,
      fileDataUrl,
    });
    onClose();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName("");
      setFileDataUrl(undefined);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  }

  return (
    <Modal
      title="Anexar exame ocupacional"
      subtitle={selectedColab ? titleCase(selectedColab.nome) : "Selecione o colaborador"}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            Anexar exame
          </Button>
        </>
      }
    >
      {colabLocked ? (
        <LabeledField label="Colaborador">
          <div style={{ fontWeight: 600, color: "var(--color-navy)" }}>
            {selectedColab ? titleCase(selectedColab.nome) : "—"}
            {selectedColab?.cargo ? <span style={{ fontWeight: 400, color: "var(--color-muted)" }}> · {titleCase(selectedColab.cargo)}</span> : null}
          </div>
        </LabeledField>
      ) : (
        <LabeledField label="Colaborador">
          <ColaboradorPicker colaboradores={colaboradores} value={colabId} onChange={setColabId} />
        </LabeledField>
      )}

      {selectedColab && procLocked ? (
        <LabeledField label="Exame">
          <div style={{ fontWeight: 600, color: "var(--color-navy)" }}>{selectedEntry?.procStr ?? "—"}</div>
        </LabeledField>
      ) : null}

      {selectedColab && !procLocked ? (
        <>
          <LabeledField label="Tipo de ASO">
            <Select options={tiposAso().map((t) => ({ value: t, label: t }))} value={tipo} onChange={(e) => setTipo(e.target.value)} />
          </LabeledField>
          <LabeledField label="Exame">
            {entries.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                Nenhum exame mapeado na matriz ocupacional para este tipo de ASO — verifique o cargo do colaborador.
              </div>
            ) : (
              <Select
                options={entries.map((e) => ({ value: e.key, label: `${e.procStr}${e.jaTem ? " (já realizado antes)" : ""}` }))}
                value={selectedKey ?? ""}
                onChange={(e) => setSelectedKey(e.target.value)}
              />
            )}
          </LabeledField>
        </>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LabeledField label="Data de realização">
          <TextInput type="date" value={dataRealizadaIso} onChange={(e) => setDataRealizadaIso(e.target.value)} />
        </LabeledField>
        <LabeledField label="Próxima data prevista" hint="Calculada pela periodicidade — ajustável manualmente">
          <TextInput
            value={proximoBR}
            onChange={(e) => {
              setProximoTouched(true);
              setProximoBR(e.target.value);
            }}
            placeholder="dd/mm/aaaa"
          />
        </LabeledField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LabeledField label="Fornecedor / clínica">
          <TextInput value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome da clínica" />
        </LabeledField>
        <LabeledField label="Valor do exame (R$)">
          <TextInput inputMode="decimal" value={valorInput} onChange={(e) => setValorInput(e.target.value)} placeholder="0,00" />
        </LabeledField>
      </div>

      <LabeledField label="Arquivo / comprovante (opcional)" hint={fileName ? `Selecionado: ${fileName}` : undefined}>
        <input type="file" onChange={handleFileChange} />
      </LabeledField>
    </Modal>
  );
}
