import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { Conversation } from './conversation.entity';

@Controller('conversations')
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(): Promise<Conversation> {
    this.logger.log('Criando nova conversa');
    return this.conversationsService.create();
  }

  @Get()
  async findAll(): Promise<Conversation[]> {
    this.logger.log('Listando todas as conversas');
    return this.conversationsService.findAll();
  }

  @Get('deleted')
  async findAllDeleted(): Promise<Conversation[]> {
    this.logger.log('Listando conversas deletadas');
    return this.conversationsService.findAllDeleted();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Conversation> {
    this.logger.log(`Buscando conversa: ${id}`);
    return this.conversationsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: Partial<Conversation>,
  ): Promise<Conversation> {
    this.logger.log(`Atualizando conversa: ${id}`);
    return this.conversationsService.update(id, updates);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deletando conversa (soft delete): ${id}`);
    await this.conversationsService.softDelete(id);
  }

  @Patch(':id/restore')
  async restore(@Param('id') id: string): Promise<Conversation> {
    this.logger.log(`Restaurando conversa: ${id}`);
    return this.conversationsService.restore(id);
  }
}
