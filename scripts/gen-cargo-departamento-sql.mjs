// Gera SQL de UPDATE/INSERT para a tabela `colaboradores` a partir de uma
// planilha "Colaboradores x Cargos x Departamentos" (colunas: Colaborador,
// CPF, DATA NASCIMENTO, Cargo Atual, Departamento/Centro de Custo, Gestor).
//
// Casa cada linha com a base local (src/data/colaboradores.json) por CPF e,
// na falta dele, por nome normalizado — cobre cadastros antigos com CPF em
// branco. Quem já existe vira UPDATE (preservando epis/exames); quem não
// existe vira INSERT com id novo, epis/exames vazios. Quem existe na base
// mas não aparece na planilha é listado em comentário no fim, sem nenhuma
// ação automática (pode ter sido desligado, ou só não constar na exportação).
//
// A saída (supabase/local/*.sql) tem dado pessoal real — nunca é commitada
// (supabase/local/ está no .gitignore). Revise o SQL gerado antes de rodar.
//
// Uso (a lib xlsx não é dependência do projeto — só deste utilitário):
//   npm install --no-save xlsx
//   node scripts/gen-cargo-departamento-sql.mjs "C:/caminho/para/planilha.xlsx"

import xlsx from "xlsx";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename } from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Uso: node scripts/gen-cargo-departamento-sql.mjs <planilha.xlsx>");
  process.exit(1);
}

function normCpf(v) {
  const d = String(v || "").replace(/\D/g, "");
  return d ? d.padStart(11, "0") : "";
}
function normName(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}
function parseSheetDate(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(String(s ?? "").trim());
  if (!m) return null;
  const [, mo, da, yy] = m;
  const year = Number(yy) <= 29 ? 2000 + Number(yy) : 1900 + Number(yy);
  return `${year}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
}
function sqlStr(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

const wb = xlsx.readFile(inputPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

// linha 0 = título da matriz, linha 1 = cabeçalho, dados a partir da linha 2.
const dataRows = rows.slice(2).filter((r) => r && r.length && r[0] && String(r[0]).trim());

const existing = JSON.parse(readFileSync("src/data/colaboradores.json", "utf-8"));
const existingByCpf = new Map(existing.filter((c) => normCpf(c.cpf)).map((c) => [normCpf(c.cpf), c]));
const existingByName = new Map(existing.map((c) => [normName(c.nome), c]));
let maxId = Math.max(...existing.map((c) => c.id));

const updates = [];
const inserts = [];
const matchedIds = new Set();

for (const r of dataRows) {
  const [nomeRaw, cpfRaw, nascRaw, cargoRaw, deptoRaw] = r;
  const cpf = normCpf(cpfRaw);
  const nome = String(nomeRaw).trim();

  const ex = (cpf && existingByCpf.get(cpf)) || existingByName.get(normName(nome));
  if (ex && matchedIds.has(ex.id)) continue; // linha duplicada na planilha

  const cargo = String(cargoRaw || "").trim();
  const departamento = String(deptoRaw || "").trim();
  const nascimento = parseSheetDate(nascRaw);

  if (ex) {
    matchedIds.add(ex.id);
    updates.push({ id: ex.id, cpf: cpf || normCpf(ex.cpf) || null, nome, cargo, departamento, nascimento });
  } else {
    maxId += 1;
    inserts.push({ id: maxId, cpf, nome, cargo, departamento, nascimento });
  }
}

const ausentes = existing.filter((c) => !matchedIds.has(c.id));

const lines = [];
lines.push(`-- Gerado a partir de '${basename(inputPath)}'.`);
lines.push("-- Contém CPF e nome reais — NÃO COMMITAR. Revise e rode no SQL Editor do Supabase.");
lines.push("");
lines.push("begin;");
lines.push("");
lines.push(`-- ${updates.length} colaborador(es) já existentes (casados por CPF ou, na falta dele, por nome) —`);
lines.push("-- atualiza cargo/departamento/nascimento/nome/cpf.");
for (const u of updates) {
  lines.push(
    `update public.colaboradores set nome = ${sqlStr(u.nome)}, cpf = ${sqlStr(u.cpf)}, cargo = ${sqlStr(u.cargo)}, departamento = ${sqlStr(u.departamento)}, nascimento = ${u.nascimento ? sqlStr(u.nascimento) : "NULL"}, updated_at = now() where id = ${u.id}; -- CPF ${u.cpf}`,
  );
}
lines.push("");
lines.push(`-- ${inserts.length} colaborador(es) novo(s) — não existiam na base anterior (nem por CPF, nem por nome).`);
for (const i of inserts) {
  lines.push(
    `insert into public.colaboradores (id, cpf, nome, cargo, departamento, epis, exames, origem, nascimento) values (${i.id}, ${sqlStr(i.cpf)}, ${sqlStr(i.nome)}, ${sqlStr(i.cargo)}, ${sqlStr(i.departamento)}, '[]'::jsonb, '[]'::jsonb, 'Cargos x Departamentos', ${i.nascimento ? sqlStr(i.nascimento) : "NULL"});`,
  );
}
lines.push("");
lines.push("commit;");
lines.push("");
if (ausentes.length) {
  lines.push("-- ATENÇÃO: os colaboradores abaixo estão na base atual mas NÃO aparecem nesta planilha");
  lines.push("-- (podem ter sido desligados, ou só não constam nesta exportação). Nenhuma ação foi");
  lines.push("-- tomada sobre eles — decida manualmente se cabe desligar/remover.");
  for (const a of ausentes) {
    lines.push(`--   id ${a.id} · ${a.nome} · CPF ${a.cpf || "(em branco)"}`);
  }
}

mkdirSync("supabase/local", { recursive: true });
const outPath = "supabase/local/atualizar-cargos-departamentos.sql";
writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");

console.log(`Gerado: ${outPath}`);
console.log({ updates: updates.length, inserts: inserts.length, ausentes: ausentes.length });
if (ausentes.length) console.log("Ausentes:", ausentes.map((a) => `${a.nome} (id ${a.id})`));
