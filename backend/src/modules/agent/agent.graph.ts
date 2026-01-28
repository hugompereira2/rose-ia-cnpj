import { AgentState } from './agent.state';
import { FetchCnpjTool } from '../tools/fetch-cnpj.tool';
import { WebSearchTool } from '../tools/web-search.tool';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ConfigService } from '@nestjs/config';
import { EXTRACT_DIGITAL_PRESENCE_PROMPT } from './prompts';
import { Logger } from '@nestjs/common';

export class AgentGraph {
  private readonly logger = new Logger(AgentGraph.name);
  private llm: any;

  constructor(
    private readonly fetchCnpjTool: FetchCnpjTool,
    private readonly webSearchTool: WebSearchTool,
    private readonly configService: ConfigService,
  ) {
    this.initializeLLM();
  }

  private initializeLLM() {
    const provider = this.configService.get<string>('LLM_PROVIDER') || 'openai';

    switch (provider) {
      case 'openai':
        this.llm = new ChatOpenAI({
          modelName: 'gpt-4o-mini',
          temperature: 0,
          openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
        });
        break;
      case 'claude':
        this.llm = new ChatAnthropic({
          modelName: 'claude-3-haiku-20240307',
          temperature: 0,
          anthropicApiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
        });
        break;
      case 'gemini':
        this.llm = new ChatGoogleGenerativeAI({
          modelName: 'gemini-pro',
          temperature: 0,
          apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
        });
        break;
      default:
        throw new Error(`LLM provider não suportado: ${provider}`);
    }
  }

  async run(initialState: AgentState): Promise<AgentState> {
    let state = { ...initialState };

    // Node 1: fetch_cnpj_data
    state = await this.fetchCnpjDataNode(state);

    // Node 2: web_search
    state = await this.webSearchNode(state);

    // Node 3: extract_digital_presence
    state = await this.extractDigitalPresenceNode(state);

    // Node 4: validate_results
    state = await this.validateResultsNode(state);

    // Node 5: final_response (não modifica estado, apenas garante completude)
    this.finalResponseNode(state);

    return state;
  }

  private async fetchCnpjDataNode(state: AgentState): Promise<AgentState> {
    this.logger.log(`[${state.requestId}] Buscando dados oficiais do CNPJ: ${state.cnpj}`);

    try {
      const dadosOficiais = await this.fetchCnpjTool.fetch(state.cnpj);

      return {
        ...state,
        dadosOficiais,
        fontes: [`BrasilAPI/OpenCNPJ - CNPJ: ${state.cnpj}`],
      };
    } catch (error) {
      this.logger.error(`[${state.requestId}] Erro ao buscar dados do CNPJ:`, error);
      throw error;
    }
  }

  private async webSearchNode(state: AgentState): Promise<AgentState> {
    if (!state.dadosOficiais) {
      this.logger.warn(`[${state.requestId}] Dados oficiais não disponíveis para busca web`);
      return { ...state, webResults: [] };
    }

    const enableWebSearch =
      this.configService.get<string>('ENABLE_WEB_SEARCH') !== 'false';

    if (!enableWebSearch) {
      this.logger.log(`[${state.requestId}] Busca web desabilitada`);
      return { ...state, webResults: [] };
    }

    this.logger.log(
      `[${state.requestId}] Buscando presença digital para: ${state.dadosOficiais.razaoSocial}`,
    );

    try {
      const webResults = await this.webSearchTool.search(
        state.dadosOficiais.razaoSocial,
        state.dadosOficiais.nomeFantasia,
        state.requestId,
        (state as any).conversationId,
      );

      return { ...state, webResults };
    } catch (error) {
      this.logger.error(`[${state.requestId}] Erro na busca web:`, error);
      return { ...state, webResults: [] };
    }
  }

  private async extractDigitalPresenceNode(state: AgentState): Promise<AgentState> {
    if (!state.dadosOficiais || !state.webResults || state.webResults.length === 0) {
      this.logger.log(`[${state.requestId}] Sem resultados de busca para extrair`);
      return {
        ...state,
        digitalPresence: {
          site: null,
          email: null,
          instagram: null,
          logo: null,
        },
      };
    }

    this.logger.log(`[${state.requestId}] Extraindo presença digital com IA`);
      
    try {
      const context = this.buildExtractionContext(state);
      const userPrompt = `## Dados da Empresa

Razão Social: ${state.dadosOficiais.razaoSocial}
${state.dadosOficiais.nomeFantasia ? `Nome Fantasia: ${state.dadosOficiais.nomeFantasia}` : ''}
CNAE: ${state.dadosOficiais.cnae}
Endereço: ${state.dadosOficiais.endereco}

## Resultados de Busca Web (Filtrados: Score >= 0.8)

${context}

**INSTRUÇÕES ESPECIAIS PARA EXTRAÇÃO DO SITE:**
1. Procure primeiro por URLs que parecem ser o site oficial (domínio principal)
2. Resultados marcados com ⭐ são prioridade
3. Se encontrar uma URL que parece ser o site oficial, use-a mesmo que o conteúdo seja limitado
4. Prefira URLs com score >= 0.8
5. Se não encontrar site oficial claro, retorne null (não invente)

Extraia APENAS informações que estejam explicitamente nas fontes acima.`;

      const fullPrompt = `${EXTRACT_DIGITAL_PRESENCE_PROMPT}\n\n${userPrompt}`;
      
      const response = await this.llm.invoke(fullPrompt);

      // Tentar extrair contagem de tokens da resposta (quando disponível)
      const usageMeta =
        (response as any).usageMetadata ||
        (response as any).usage_metadata ||
        (response as any).usage;

      let totalTokens: number | undefined;
      if (usageMeta) {
        totalTokens =
          usageMeta.totalTokens ??
          usageMeta.total_tokens ??
          (typeof usageMeta.inputTokens === 'number' &&
          typeof usageMeta.outputTokens === 'number'
            ? usageMeta.inputTokens + usageMeta.outputTokens
            : undefined);
      }
      
      const content =
        typeof response.content === 'string'
          ? response.content
          : (response.content as any)?.[0]?.text || '';

      // Se o provedor não devolver usage, estimar tokens a partir do texto (prompt + resposta)
      if (typeof totalTokens !== 'number') {
        const approxTokens = this.estimateTokens(`${fullPrompt}\n\n${content}`);
        totalTokens = approxTokens;
      }

      // Tentar extrair JSON da resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`[${state.requestId}] Não foi possível extrair JSON da resposta do LLM`);
        return {
          ...state,
          digitalPresence: {
            site: null,
            email: null,
            instagram: null,
            logo: null,
          },
        };
      }

      const digitalPresence = JSON.parse(jsonMatch[0]);
      
      // Se o site foi encontrado mas a logo não, tentar buscar automaticamente
      let finalLogo = digitalPresence.logo;
      if (digitalPresence.site && !digitalPresence.logo) {
        finalLogo = this.tryFindLogoUrl(digitalPresence.site);
      }
      
      const nextState: AgentState = {
        ...state,
        digitalPresence: {
          site: digitalPresence.site || null,
          email: digitalPresence.email || null,
          instagram: digitalPresence.instagram || null,
          logo: finalLogo,
        },
        fontes: [...(state.fontes || []), ...(digitalPresence.fontes || [])],
      };

      if (typeof totalTokens === 'number') {
        nextState.tokensUsed = (state.tokensUsed || 0) + totalTokens;
      }

      return nextState;
    } catch (error) {
      this.logger.error(`[${state.requestId}] Erro ao extrair presença digital:`, error);
      return {
        ...state,
        digitalPresence: {
          site: null,
          email: null,
          instagram: null,
          logo: null,
        },
      };
    }
  }

  private buildExtractionContext(state: AgentState): string {
    if (!state.webResults || state.webResults.length === 0) {
      return 'Nenhum resultado encontrado.';
    }

    // Priorizar resultados que parecem ser sites oficiais (não são diretórios, marketplaces, etc)
    const prioritizedResults = [...state.webResults].sort((a, b) => {
      const aIsOfficial = this.looksLikeOfficialSite(a.url);
      const bIsOfficial = this.looksLikeOfficialSite(b.url);
      
      if (aIsOfficial && !bIsOfficial) return -1;
      if (!aIsOfficial && bIsOfficial) return 1;
      
      // Se ambos são oficiais ou ambos não são, ordenar por score
      return (b.score || 0) - (a.score || 0);
    });

    
    return prioritizedResults
      .map((result, index) => {
        const isOfficial = this.looksLikeOfficialSite(result.url);
        // Incluir mais conteúdo para melhorar detecção de logo
        const contentLength = Math.min(1200, result.content.length);
        return `### Resultado ${index + 1}${isOfficial ? ' ⭐ (Possível Site Oficial)' : ''}
Título: ${result.title}
URL: ${result.url}
Score: ${(result.score || 0).toFixed(2)}
Conteúdo: ${result.content.substring(0, contentLength)}${result.content.length > contentLength ? '...' : ''}`;
      })
      .join('\n\n');
  }

  private tryFindLogoUrl(siteUrl: string): string | null {
    try {
      const url = new URL(siteUrl);
      const domain = url.host;
      
      // Usar API pública de favicon como solução mais confiável
      // Google Favicon API é amplamente suportada e funciona para a maioria dos sites
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (error) {
      this.logger.warn(`[tryFindLogoUrl] Erro ao construir URL de logo para ${siteUrl}:`, error);
      return null;
    }
  }

  private looksLikeOfficialSite(url: string): boolean {
    const urlLower = url.toLowerCase();
    
    // Excluir diretórios, marketplaces, redes sociais
    const excludedPatterns = [
      'linkedin.com',
      'facebook.com',
      'instagram.com',
      'twitter.com',
      'reclameaqui.com.br',
      'paginasamarelas.com.br',
      'guiamais.com.br',
      'apontador.com.br',
      'mercadolivre.com.br',
      'amazon.com.br',
      'magazineluiza.com.br',
      'americanas.com.br',
      'casasbahia.com.br',
      'extra.com.br',
      'wikipedia.org',
      'google.com',
      'youtube.com',
    ];

    if (excludedPatterns.some(pattern => urlLower.includes(pattern))) {
      return false;
    }

    // Considerar oficial se não for um dos excluídos e tiver formato de site
    return urlLower.startsWith('http://') || urlLower.startsWith('https://');
  }

  /**
   * Estimativa simples de tokens a partir do texto.
   * Aproxima ~4 caracteres por token, o que é razoável para modelos GPT-like.
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return 0;
    const approx = Math.round(cleaned.length / 4);
    return approx;
  }

  private async validateResultsNode(state: AgentState): Promise<AgentState> {
    this.logger.log(`[${state.requestId}] Validando resultados`);

    // Validar que cada dado tem fonte associada
    const fontes = [...(state.fontes || [])];

    if (state.digitalPresence?.site) {
      try {
        const siteUrl = new URL(state.digitalPresence.site);
        const siteSource = state.webResults?.find((r) =>
          r.url.includes(siteUrl.hostname),
        );
        if (siteSource && !fontes.includes(siteSource.url)) {
          fontes.push(siteSource.url);
        }
      } catch (error) {
        // URL inválida, ignorar
        this.logger.warn(`[${state.requestId}] URL inválida: ${state.digitalPresence.site}`);
      }
    }

    if (state.digitalPresence?.email) {
      const emailSource = state.webResults?.find((r) =>
        r.content.toLowerCase().includes(state.digitalPresence!.email!.toLowerCase()),
      );
      if (emailSource && !fontes.includes(emailSource.url)) {
        fontes.push(emailSource.url);
      }
    }

    if (state.digitalPresence?.instagram) {
      const instagramSource = state.webResults?.find((r) =>
        r.content.toLowerCase().includes('instagram'),
      );
      if (instagramSource && !fontes.includes(instagramSource.url)) {
        fontes.push(instagramSource.url);
      }
    }

    return {
      ...state,
      fontes: [...new Set(fontes)], // Remover duplicatas
    };
  }

  private finalResponseNode(state: AgentState): void {
    this.logger.log(`[${state.requestId}] Finalizando resposta`);
    // Node final - não precisa modificar estado, apenas garantir que está completo
  }
}
