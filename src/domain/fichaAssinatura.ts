import type { BadgeTone } from "./exameStatus";
import type { EntregaEpi } from "../types/domain";

export type StatusAssinatura = "assinada" | "aguardando" | "pendente";

/**
 * 🟢 assinada — ficha assinada já anexada.
 * 🟡 aguardando — a ficha (PDF) já foi gerada/impressa, falta anexar a via assinada.
 * 🔴 pendente — a ficha ainda nem foi gerada.
 */
export function statusAssinaturaFor(entrega: EntregaEpi): StatusAssinatura {
  if (entrega.assinaturaDataUrl) return "assinada";
  if (entrega.fichaGeradaEm) return "aguardando";
  return "pendente";
}

export function labelStatusAssinatura(status: StatusAssinatura): string {
  if (status === "assinada") return "Assinada";
  if (status === "aguardando") return "Aguardando assinatura";
  return "Documento não anexado";
}

export function toneStatusAssinatura(status: StatusAssinatura): BadgeTone {
  if (status === "assinada") return "success";
  if (status === "aguardando") return "warning";
  return "danger";
}
