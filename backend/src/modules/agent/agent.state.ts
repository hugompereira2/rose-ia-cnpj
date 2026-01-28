import { CnpjData } from '../tools/fetch-cnpj.tool';
import { SearchResult } from '../tools/web-search.tool';

export interface DadosOficiais {
  razaoSocial: string;
  nomeFantasia?: string;
  situacao: string;
  cnae: string;
  endereco: string;
}

export interface DigitalPresence {
  site?: string | null;
  email?: string | null;
  instagram?: string | null;
  logo?: string | null;
}

export interface AgentState {
  cnpj: string;
  dadosOficiais?: DadosOficiais;
  webResults?: SearchResult[];
  digitalPresence?: DigitalPresence;
  fontes: string[];
  requestId?: string;
  conversationId?: string;
  /**
   * Total de tokens usados pelas chamadas de LLM
   * (input + output), quando a API fornece essa informação.
   */
  tokensUsed?: number;
}
