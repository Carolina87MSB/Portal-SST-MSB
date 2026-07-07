import type { BadgeTone } from "./exameStatus";
import type { FichaEntregaEpi } from "../types/domain";

export type StatusFichaEpi = "assinada" | "aguardando";

/**
 * 🟢 assinada — a via assinada já foi anexada pelo RH.
 * 🟡 aguardando — a ficha (PDF) foi gerada, falta anexar a via assinada.
 */
export function statusFichaEpi(ficha: FichaEntregaEpi): StatusFichaEpi {
  return ficha.assinaturaDataUrl ? "assinada" : "aguardando";
}

export function labelStatusFichaEpi(status: StatusFichaEpi): string {
  return status === "assinada" ? "Assinada" : "Aguardando assinatura";
}

export function toneStatusFichaEpi(status: StatusFichaEpi): BadgeTone {
  return status === "assinada" ? "success" : "warning";
}
