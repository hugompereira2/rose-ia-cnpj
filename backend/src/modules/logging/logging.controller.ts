import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { LoggingService } from './logging.service';
import { Message } from './message.entity';
import { AgentExecutionLog } from './agent-execution-log.entity';
import { TavilySearchLog } from './tavily-search-log.entity';

@Controller('logs')
export class LoggingController {
  private readonly logger = new Logger(LoggingController.name);

  constructor(private readonly loggingService: LoggingService) {}

  @Get('messages/:conversationId')
  async getMessages(@Param('conversationId') conversationId: string): Promise<Message[]> {
    this.logger.log(`Buscando mensagens da conversa: ${conversationId}`);
    return this.loggingService.getMessagesByConversation(conversationId);
  }

  @Get('agent')
  async getAgentLogs(
    @Query('requestId') requestId?: string,
    @Query('cnpj') cnpj?: string,
    @Query('conversationId') conversationId?: string,
    @Query('operation') operation?: string,
    @Query('limit') limit?: string,
  ): Promise<AgentExecutionLog[]> {
    this.logger.log('Buscando logs de execução do agente');
    return this.loggingService.getAgentLogs({
      requestId,
      cnpj,
      conversationId,
      operation,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('tavily')
  async getTavilyLogs(
    @Query('requestId') requestId?: string,
    @Query('conversationId') conversationId?: string,
    @Query('searchTerm') searchTerm?: string,
    @Query('limit') limit?: string,
  ): Promise<TavilySearchLog[]> {
    this.logger.log('Buscando logs de busca Tavily');
    return this.loggingService.getTavilyLogs({
      requestId,
      conversationId,
      searchTerm,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('agent/:requestId')
  async getAgentLogByRequestId(@Param('requestId') requestId: string): Promise<AgentExecutionLog[]> {
    this.logger.log(`Buscando log do agente por requestId: ${requestId}`);
    return this.loggingService.getAgentLogs({ requestId });
  }

  @Get('tavily/:requestId')
  async getTavilyLogByRequestId(@Param('requestId') requestId: string): Promise<TavilySearchLog[]> {
    this.logger.log(`Buscando log Tavily por requestId: ${requestId}`);
    return this.loggingService.getTavilyLogs({ requestId });
  }
}
