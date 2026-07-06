import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { colaboradoresRepository } from "../repositories/colaboradoresRepository";
import type { PortalAction } from "./actions";
import { portalReducer } from "./reducer";
import { buildInitialState } from "./seed";
import type { PortalState } from "./types";

const STORAGE_KEY = "msb_sst_portal_v1";

function loadPersisted(): PortalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PortalState>;
      if (Array.isArray(parsed.colaboradores)) return { ...buildInitialState(), ...parsed };
    }
  } catch {
    // localStorage indisponível ou payload corrompido — segue com o estado semente.
  }
  return buildInitialState();
}

interface PortalStoreValue {
  state: PortalState;
  dispatch: (action: PortalAction) => void;
  colaboradoresLoading: boolean;
  colaboradoresError: string | null;
}

const PortalStoreContext = createContext<PortalStoreValue | null>(null);

export function PortalStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(portalReducer, undefined, loadPersisted);
  const [colaboradoresLoading, setColaboradoresLoading] = useState(false);
  const [colaboradoresError, setColaboradoresError] = useState<string | null>(null);

  // Carrega a base de colaboradores do Supabase assim que há uma sessão
  // autenticada (RLS só libera SELECT para `authenticated`); ao deslogar,
  // zera tudo — nenhum dado pessoal deve sobrar em memória/localStorage.
  useEffect(() => {
    if (!user) {
      dispatch({ type: "RESET" });
      setColaboradoresError(null);
      setColaboradoresLoading(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignora
      }
      return;
    }
    let cancelado = false;
    setColaboradoresLoading(true);
    setColaboradoresError(null);
    colaboradoresRepository
      .getColaboradores()
      .then((colaboradores) => {
        if (cancelado) return;
        dispatch({ type: "SET_COLABORADORES", colaboradores });
      })
      .catch((err: Error) => {
        if (cancelado) return;
        setColaboradoresError(err.message);
      })
      .finally(() => {
        if (!cancelado) setColaboradoresLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return; // nada para persistir quando deslogado (ver efeito acima)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // armazenamento cheio ou bloqueado — segue apenas em memória nesta sessão.
    }
  }, [state, user]);

  const value = useMemo(
    () => ({ state, dispatch, colaboradoresLoading, colaboradoresError }),
    [state, colaboradoresLoading, colaboradoresError],
  );
  return <PortalStoreContext.Provider value={value}>{children}</PortalStoreContext.Provider>;
}

export function usePortalStore(): PortalStoreValue {
  const ctx = useContext(PortalStoreContext);
  if (!ctx) throw new Error("usePortalStore precisa ser usado dentro de <PortalStoreProvider>");
  return ctx;
}
