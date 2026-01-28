import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { AgentGraph } from './agent.graph';
import { AgentState } from './agent.state';
import { FetchCnpjTool } from '../tools/fetch-cnpj.tool';
import { WebSearchTool } from '../tools/web-search.tool';
import { LoggingService } from '../logging/logging.service';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ROSE_PERSONALITY_PROMPT } from './prompts/rose-personality.prompt';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private agentGraph: AgentGraph;
  private llm: any;
  private llmProvider: string;
  private llmModel: string;

  constructor(
    private readonly fetchCnpjTool: FetchCnpjTool,
    private readonly webSearchTool: WebSearchTool,
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {
    this.agentGraph = new AgentGraph(
      this.fetchCnpjTool,
      this.webSearchTool,
      this.configService,
    );
    this.initializeLLM();
  }

  private initializeLLM() {
    const provider = this.configService.get<string>('LLM_PROVIDER') || 'openai';
    this.llmProvider = provider;

    switch (provider) {
      case 'openai':
        this.llmModel = 'gpt-4o-mini';
        this.llm = new ChatOpenAI({
          modelName: this.llmModel,
          temperature: 0.7, // Mais criativo para conversação
          openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
        });
        break;
      case 'claude':
        this.llmModel = 'claude-3-haiku-20240307';
        this.llm = new ChatAnthropic({
          modelName: this.llmModel,
          temperature: 0.7,
          anthropicApiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
        });
        break;
      case 'gemini':
        this.llmModel = 'gemini-pro';
        this.llm = new ChatGoogleGenerativeAI({
          modelName: this.llmModel,
          temperature: 0.7,
          apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
        });
        break;
      default:
        throw new Error(`LLM provider não suportado: ${provider}`);
    }
  }

  async enrichCnpj(cnpj: string, conversationId?: string): Promise<any> {
    const requestId = uuidv4();
    const startTime = Date.now();
    const cleanCnpj = this.cleanCnpj(cnpj);
    this.logger.log(`[${requestId}] Iniciando enriquecimento do CNPJ: ${cnpj}`);

    try {
      const initialState: AgentState = {
        cnpj: cleanCnpj,
        fontes: [],
        requestId,
        conversationId,
      };

      const finalState = await this.agentGraph.run(initialState);
      const durationMs = Date.now() - startTime;

      this.logger.log(`[${requestId}] Enriquecimento concluído com sucesso`);

      const response = this.formatResponse(finalState);
      // Log da execução do agente
      await this.loggingService.logAgentExecution({
        requestId,
        cnpj: cleanCnpj,
        conversationId,
        operation: 'enrich',
        input: cnpj,
        output: response,
        state: {
          dadosOficiais: finalState.dadosOficiais,
          digitalPresence: finalState.digitalPresence,
          fontes: finalState.fontes,
        },
        llmProvider: this.llmProvider,
        model: this.llmModel,
        tokensUsed: finalState.tokensUsed,
        durationMs,
        success: true,
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro no enriquecimento:`, error);

      // Log do erro
      await this.loggingService.logAgentExecution({
        requestId,
        cnpj: cleanCnpj,
        conversationId,
        operation: 'enrich',
        input: cnpj,
        llmProvider: this.llmProvider,
        model: this.llmModel,
        durationMs,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  private cleanCnpj(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  }

  private formatResponse(state: AgentState): any {
    const response = {
      cnpj: state.cnpj,
      razaoSocial: state.dadosOficiais?.razaoSocial || null,
      nomeFantasia: state.dadosOficiais?.nomeFantasia || null,
      situacao: state.dadosOficiais?.situacao || null,
      cnae: state.dadosOficiais?.cnae || null,
      endereco: state.dadosOficiais?.endereco || null,
      site: state.digitalPresence?.site || null,
      email: state.digitalPresence?.email || null,
      instagram: state.digitalPresence?.instagram || null,
      logo: state.digitalPresence?.logo || null,
      fontes: state.fontes || [],
      requestId: state.requestId,
      message: this.generateRoseMessage(state),
    };

    return response;
  }

  private generateRoseMessage(state: AgentState): string {
    const hasData = state.dadosOficiais?.razaoSocial;
    const hasDigitalPresence = 
      state.digitalPresence?.site || 
      state.digitalPresence?.email || 
      state.digitalPresence?.instagram;

    if (!hasData || !state.dadosOficiais) {
      return 'Desculpe, não consegui encontrar dados oficiais para este CNPJ. Verifique se o CNPJ está correto.';
    }

    let message = `Encontrei informações sobre ${state.dadosOficiais.razaoSocial}! 🌹\n\n`;
    
    if (hasDigitalPresence) {
      message += 'Também encontrei algumas informações sobre a presença digital da empresa:\n';
      if (state.digitalPresence?.site) message += `- Site: ${state.digitalPresence.site}\n`;
      if (state.digitalPresence?.email) message += `- Email: ${state.digitalPresence.email}\n`;
      if (state.digitalPresence?.instagram) message += `- Instagram: ${state.digitalPresence.instagram}\n`;
    } else {
      message += 'Não encontrei informações sobre presença digital (site, email, Instagram) para esta empresa.';
    }

    if (state.fontes && state.fontes.length > 0) {
      message += `\n\n📚 Fontes consultadas: ${state.fontes.length} fonte(s)`;
    }

    return message;
  }

  async chat(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    conversationId?: string,
  ): Promise<string> {
    const requestId = uuidv4();
    const startTime = Date.now();
    this.logger.log(`[${requestId}] Conversação com Rose: ${message.substring(0, 50)}...`);

    try {
      // Construir prompt com histórico de conversa
      const historyText = conversationHistory
        .slice(-10)
        .map((msg) => {
          const role = msg.role === 'user' ? 'Usuário' : 'Rose';
          return `${role}: ${msg.content}`;
        })
        .join('\n\n');

      const fullPrompt = `${ROSE_PERSONALITY_PROMPT}

${historyText ? `Histórico da conversa:\n${historyText}\n\n` : ''}Usuário: ${message}

Rose:`;

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
      const durationMs = Date.now() - startTime;

      this.logger.log(`[${requestId}] Resposta da Rose gerada`);

      // Log da execução do agente
      await this.loggingService.logAgentExecution({
        requestId,
        conversationId,
        operation: 'chat',
        input: message,
        output: content.trim(),
        llmProvider: this.llmProvider,
        model: this.llmModel,
        tokensUsed: totalTokens,
        durationMs,
        success: true,
      });

      return content.trim();
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro na conversação:`, error);

      // Log do erro
      await this.loggingService.logAgentExecution({
        requestId,
        conversationId,
        operation: 'chat',
        input: message,
        llmProvider: this.llmProvider,
        model: this.llmModel,
        durationMs,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error('Erro ao processar mensagem. Por favor, tente novamente.');
    }
  }

  isValidCnpj(text: string): boolean {
    const cleanCnpj = text.replace(/\D/g, '');
    return cleanCnpj.length === 14 || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(text);
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
}
