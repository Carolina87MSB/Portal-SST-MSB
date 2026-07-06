// Camada de acesso a dados para colaboradores — a única entidade com dado
// pessoal sensível (CPF, nome, exames de saúde). Ao contrário dos catálogos
// estáticos em portalRepository.ts, esta busca é assíncrona e vem do Supabase
// (tabela `colaboradores`, protegida por RLS — só usuários autenticados leem).
//
// Trocar a fonte de novo no futuro (outro backend) é uma mudança isolada
// neste arquivo; nada mais no app importa o Supabase diretamente para dados
// de colaborador.

import { supabase, supabaseConfigured } from "../lib/supabaseClient";
import type { Colaborador } from "../types/domain";

interface ColaboradorRow {
  id: number;
  cpf: string;
  nome: string;
  cargo: string | null;
  departamento: string | null;
  epis: string[] | null;
  exames: Colaborador["exames"] | null;
  origem: string | null;
  nascimento: string | null;
}

function fromRow(row: ColaboradorRow): Colaborador {
  return {
    id: row.id,
    cpf: row.cpf,
    nome: row.nome,
    cargo: row.cargo ?? "",
    departamento: row.departamento ?? "",
    epis: row.epis ?? [],
    exames: row.exames ?? [],
    origem: row.origem ?? "",
    nascimento: row.nascimento ?? "",
  };
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local " +
        "(veja .env.example) para carregar a base de colaboradores.",
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export interface ColaboradoresRepository {
  getColaboradores(): Promise<Colaborador[]>;
}

class SupabaseColaboradoresRepository implements ColaboradoresRepository {
  async getColaboradores(): Promise<Colaborador[]> {
    if (!supabaseConfigured) throw new SupabaseNotConfiguredError();

    const { data, error } = await supabase.from("colaboradores").select("*").order("nome", { ascending: true });

    if (error) {
      throw new Error(`Falha ao carregar colaboradores do Supabase: ${error.message}`);
    }
    return (data as ColaboradorRow[]).map(fromRow);
  }
}

export const colaboradoresRepository: ColaboradoresRepository = new SupabaseColaboradoresRepository();
