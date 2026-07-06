import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
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
}

const PortalStoreContext = createContext<PortalStoreValue | null>(null);

export function PortalStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(portalReducer, undefined, loadPersisted);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // armazenamento cheio ou bloqueado — segue apenas em memória nesta sessão.
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <PortalStoreContext.Provider value={value}>{children}</PortalStoreContext.Provider>;
}

export function usePortalStore(): PortalStoreValue {
  const ctx = useContext(PortalStoreContext);
  if (!ctx) throw new Error("usePortalStore precisa ser usado dentro de <PortalStoreProvider>");
  return ctx;
}
