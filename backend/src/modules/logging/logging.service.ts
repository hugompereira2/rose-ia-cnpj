import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { AgentExecutionLog } from './agent-execution-log.entity';
import { TavilySearchLog } from './tavily-search-log.entity';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(AgentExecutionLog)
    private agentLogRepository: Repository<AgentExecutionLog>,
    @InjectRepository(TavilySearchLog)
    private tavilyLogRepository: Repository<TavilySearchLog>,
  ) {}

  async logMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: any,
  ): Promise<Message> {
    try {
      const message = this.messageRepository.create({
        conversationId,
        role,
        content,
        metadata,
      });
      return await this.messageRepository.save(message);
    } catch (error) {
      this.logger.error('Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  async logAgentExecution(log: {
    requestId: string;
    cnpj?: string;
    conversationId?: string;
    operation: 'enrich' | 'chat' | 'extract';
    input?: string;
    output?: any;
    state?: any;
    llmProvider?: string;
    model?: string;
    tokensUsed?: number;
    durationMs?: number;
    success: boolean;
    error?: string;
  }): Promise<AgentExecutionLog> {
    try {
      const agentLog = this.agentLogRepository.create(log);
      return await this.agentLogRepository.save(agentLog);
    } catch (error) {
      this.logger.error('Erro ao salvar log de execução do agente:', error);
      throw error;
    }
  }

  async logTavilySearch(log: {
    requestId?: string;
    conversationId?: string;
    searchTerm: string;
    razaoSocial?: string;
    nomeFantasia?: string;
    resultsCount: number;
    results?: Array<{
      title: string;
      url: string;
      content: string;
      score?: number;
    }>;
    fromCache: boolean;
    durationMs?: number;
    success: boolean;
    error?: string;
  }): Promise<TavilySearchLog> {
    try {
      const tavilyLog = this.tavilyLogRepository.create(log);
      return await this.tavilyLogRepository.save(tavilyLog);
    } catch (error) {
      this.logger.error('Erro ao salvar log de busca Tavily:', error);
      throw error;
    }
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async getAgentLogs(filters?: {
    requestId?: string;
    cnpj?: string;
    conversationId?: string;
    operation?: string;
    limit?: number;
  }): Promise<AgentExecutionLog[]> {
    const query = this.agentLogRepository.createQueryBuilder('log');

    if (filters?.requestId) {
      query.andWhere('log.requestId = :requestId', { requestId: filters.requestId });
    }
    if (filters?.cnpj) {
      query.andWhere('log.cnpj = :cnpj', { cnpj: filters.cnpj });
    }
    if (filters?.conversationId) {
      query.andWhere('log.conversationId = :conversationId', { conversationId: filters.conversationId });
    }
    if (filters?.operation) {
      query.andWhere('log.operation = :operation', { operation: filters.operation });
    }

    query.orderBy('log.createdAt', 'DESC');
    if (filters?.limit) {
      query.limit(filters.limit);
    }

    return query.getMany();
  }

  async getTavilyLogs(filters?: {
    requestId?: string;
    conversationId?: string;
    searchTerm?: string;
    limit?: number;
  }): Promise<TavilySearchLog[]> {
    const query = this.tavilyLogRepository.createQueryBuilder('log');

    if (filters?.requestId) {
      query.andWhere('log.requestId = :requestId', { requestId: filters.requestId });
    }
    if (filters?.conversationId) {
      query.andWhere('log.conversationId = :conversationId', { conversationId: filters.conversationId });
    }
    if (filters?.searchTerm) {
      query.andWhere('log.searchTerm ILIKE :searchTerm', { searchTerm: `%${filters.searchTerm}%` });
    }

    query.orderBy('log.createdAt', 'DESC');
    if (filters?.limit) {
      query.limit(filters.limit);
    }

    return query.getMany();
  }
}
