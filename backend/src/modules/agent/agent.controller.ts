import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { IsString, IsNotEmpty, Matches, IsOptional, IsArray } from 'class-validator';
import { AgentService } from './agent.service';
import { LoggingService } from '../logging/logging.service';

class EnrichCnpjDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, {
    message: 'CNPJ deve estar no formato válido (XX.XXX.XXX/XXXX-XX ou 14 dígitos)',
  })
  cnpj: string;
}

class ChatDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: string; content: string }>;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly loggingService: LoggingService,
  ) {}

  @Post('enrich')
  @HttpCode(HttpStatus.OK)
  async enrichCnpj(@Body() dto: EnrichCnpjDto) {
    this.logger.log(`Recebida requisição para enriquecer CNPJ: ${dto.cnpj}`);
    return this.agentService.enrichCnpj(dto.cnpj);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatDto) {
    this.logger.log(`Recebida mensagem para conversação: ${dto.message.substring(0, 50)}...`);
    
    // Salvar mensagem do usuário
    if (dto.conversationId) {
      await this.loggingService.logMessage(
        dto.conversationId,
        'user',
        dto.message,
      );
    }
    
    let response: any;
    
    // Se for um CNPJ, processar como enriquecimento
    if (this.agentService.isValidCnpj(dto.message)) {
      response = await this.agentService.enrichCnpj(dto.message, dto.conversationId);
    } else {
      // Caso contrário, conversar normalmente
      const chatResponse = await this.agentService.chat(dto.message, dto.history || [], dto.conversationId);
      response = { message: chatResponse };
    }

    // Salvar resposta do assistente
    if (dto.conversationId) {
      await this.loggingService.logMessage(
        dto.conversationId,
        'assistant',
        response.message || JSON.stringify(response),
        {
          cnpj: response.cnpj,
          requestId: response.requestId,
          data: response,
        },
      );
    }

    return response;
  }
}
