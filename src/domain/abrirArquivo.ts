// Trava contra abertura duplicada do mesmo arquivo — no nível do módulo, não
// de componente/estado do React, então funciona mesmo se o handler de clique
// disparar mais de uma vez por algum motivo fora do nosso controle (ex.:
// hardware de mouse com bounce no clique, ou o componente montado mais de uma
// vez). Ignora qualquer chamada para a MESMA url que já foi aberta há menos
// de 2 segundos.
let ultimaAbertura: { url: string; em: number } | null = null;

const JANELA_DEDUP_MS = 2000;

/** Abre a signed URL numa aba nova; se o navegador bloquear o pop-up, navega
 * na aba atual. Chamadas repetidas para a mesma url dentro de 2s são ignoradas. */
export function abrirArquivoUmaVez(url: string): void {
  const agora = Date.now();
  if (ultimaAbertura && ultimaAbertura.url === url && agora - ultimaAbertura.em < JANELA_DEDUP_MS) {
    return;
  }
  ultimaAbertura = { url, em: agora };
  const janela = window.open(url, "_blank", "noopener,noreferrer");
  if (!janela) window.location.href = url;
}
