import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "../types/domain";

const STORAGE_KEY = "msb_sst_user_v1";
const DOMINIO_CORPORATIVO = "@msbbrasil.com";

// Lista de e-mails liberados individualmente pelo RH. Não há autocadastro.
// NOTA DE SEGURANÇA: esta é uma verificação client-side, adequada para uma
// demonstração/uso interno controlado. Antes de expor este portal fora de uma
// rede confiável, troque por autenticação real (SSO/OAuth corporativo) no backend.
const EMAILS_AUTORIZADOS = ["carolina.cruz@msbbrasil.com", "leslie.souza@msbbrasil.com"];

function autorizado(email: string): boolean {
  return EMAILS_AUTORIZADOS.includes(email.trim().toLowerCase());
}

function loadPersistedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed?.email && autorizado(parsed.email)) return parsed;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora storage indisponível
  }
  return null;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadPersistedUser);

  const login = useCallback((rawEmail: string): { ok: true } | { ok: false; error: string } => {
    const email = rawEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { ok: false, error: "Informe um e-mail válido." };
    }
    if (!email.endsWith(DOMINIO_CORPORATIVO)) {
      return { ok: false, error: "Acesso restrito ao e-mail corporativo MSB (@msbbrasil.com). E-mails pessoais não são permitidos." };
    }
    if (!autorizado(email)) {
      return { ok: false, error: "E-mail não autorizado. O acesso é liberado individualmente pelo RH — não há cadastro aberto de usuários." };
    }
    const authUser: AuthUser = { email, role: "rh" };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    } catch {
      // segue apenas em memória
    }
    setUser(authUser);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignora
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, login, logout, canEdit: user?.role === "rh" }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  return ctx;
}
