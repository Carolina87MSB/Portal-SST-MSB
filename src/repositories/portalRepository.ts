// Camada de acesso a dados. Hoje lê arquivos JSON estáticos (gerados a partir da
// planilha oficial de EPI/ASO e da matriz PCMSO/PGR); amanhã pode ser trocada por
// chamadas a uma API real sem que o restante da aplicação precise mudar — todo o
// resto do app depende apenas destas assinaturas de função.

import colaboradoresJson from "../data/colaboradores.json";
import matrizEpiJson from "../data/matrizEpi.json";
import matrizProcJson from "../data/matrizProc.json";
import epiCatalogoJson from "../data/epiCatalogo.json";
import matrizOcupacionalJson from "../data/matrizOcupacional.json";
import metaJson from "../data/meta.json";
import type {
  Colaborador,
  EpiCatalogoItem,
  MatrizEpiFuncao,
  MatrizOcupacional,
  MatrizProcFuncao,
} from "../types/domain";

export interface PortalRepository {
  getGeradoEm(): string;
  getColaboradores(): Colaborador[];
  getMatrizEpi(): MatrizEpiFuncao[];
  getMatrizProc(): MatrizProcFuncao[];
  getEpiCatalogo(): EpiCatalogoItem[];
  getMatrizOcupacional(): MatrizOcupacional;
}

class StaticPortalRepository implements PortalRepository {
  getGeradoEm(): string {
    return metaJson.geradoEm;
  }
  getColaboradores(): Colaborador[] {
    return colaboradoresJson as Colaborador[];
  }
  getMatrizEpi(): MatrizEpiFuncao[] {
    return matrizEpiJson as MatrizEpiFuncao[];
  }
  getMatrizProc(): MatrizProcFuncao[] {
    return matrizProcJson as MatrizProcFuncao[];
  }
  getEpiCatalogo(): EpiCatalogoItem[] {
    return epiCatalogoJson as EpiCatalogoItem[];
  }
  getMatrizOcupacional(): MatrizOcupacional {
    return matrizOcupacionalJson as MatrizOcupacional;
  }
}

export const portalRepository: PortalRepository = new StaticPortalRepository();
