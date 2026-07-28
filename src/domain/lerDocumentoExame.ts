// Leitura local (sem serviço externo) do PDF anexado a um ASO, usada para
// pré-marcar automaticamente quais exames da matriz ocupacional foram
// realizados. Só funciona com PDFs que tenham camada de texto — digitalizações
// ou fotos escaneadas como imagem não têm texto para extrair.

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ExameMatrizEntry } from "./matriz";

GlobalWorkerOptions.workerSrc = workerUrl;

const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizarTexto(value: string): string {
  return value.normalize("NFD").replace(DIACRITICOS, "").toUpperCase();
}

function tokenizar(value: string): string[] {
  return normalizarTexto(value)
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

function contemSubsequencia(tokens: string[], alvo: string[]): boolean {
  if (alvo.length === 0) return false;
  for (let i = 0; i <= tokens.length - alvo.length; i++) {
    let bate = true;
    for (let j = 0; j < alvo.length; j++) {
      if (tokens[i + j] !== alvo[j]) {
        bate = false;
        break;
      }
    }
    if (bate) return true;
  }
  return false;
}

async function extrairTextoPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const partes: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    partes.push(
      content.items.map((item) => (typeof (item as { str?: unknown }).str === "string" ? (item as { str: string }).str : "")).join(" "),
    );
  }
  return partes.join(" ");
}

export interface LeituraExamesResult {
  /** false quando o arquivo não é um PDF com texto legível (ex.: digitalização/foto) — a UI deve pedir seleção manual. */
  extraiu: boolean;
  keysEncontradas: string[];
}

/** Identifica, dentre `entries`, quais exames são citados no PDF anexado. */
export async function lerExamesDoDocumento(file: File, entries: ExameMatrizEntry[]): Promise<LeituraExamesResult> {
  const ehPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!ehPdf) return { extraiu: false, keysEncontradas: [] };

  let texto = "";
  try {
    texto = await extrairTextoPdf(file);
  } catch {
    return { extraiu: false, keysEncontradas: [] };
  }
  if (texto.trim().length < 10) return { extraiu: false, keysEncontradas: [] };

  const tokensDoc = tokenizar(texto);
  const keysEncontradas: string[] = [];
  for (const entry of entries) {
    const codigoSemZeros = entry.codigo.replace(/^0+(?=\d)/, "");
    const codigoBate = !!entry.codigo && (tokensDoc.includes(entry.codigo) || tokensDoc.includes(codigoSemZeros));
    const nomeTokens = tokenizar(entry.nome);
    const nomeBate = contemSubsequencia(tokensDoc, nomeTokens);
    if (codigoBate || nomeBate) keysEncontradas.push(entry.key);
  }

  return { extraiu: true, keysEncontradas };
}
