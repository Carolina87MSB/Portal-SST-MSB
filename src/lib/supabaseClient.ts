import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** true quando as variáveis de ambiente do Supabase foram configuradas (ver .env.example). */
export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Portal SST] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas — " +
      "copie .env.example para .env.local e preencha com os valores do seu projeto Supabase.",
  );
}

// Em dev sem .env.local configurado, cria o client com valores fictícios para não
// quebrar o import em todo o app; chamadas de rede vão falhar de forma explícita
// (ver AuthContext/colaboradoresRepository, que checam supabaseConfigured antes).
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder-anon-key");
