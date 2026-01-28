import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationsRepository: Repository<Conversation>,
  ) {}

  async create(): Promise<Conversation> {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation = this.conversationsRepository.create({
      id,
      deleted: false,
    });

    const saved = await this.conversationsRepository.save(conversation);
    this.logger.log(`Conversa criada: ${id}`);
    return saved;
  }

  async findAll(): Promise<Conversation[]> {
    return this.conversationsRepository.find({
      where: { deleted: false },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Conversation> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id, deleted: false },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversa com ID ${id} não encontrada`);
    }

    return conversation;
  }

  async update(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const conversation = await this.findOne(id);
    
    Object.assign(conversation, updates);
    const updated = await this.conversationsRepository.save(conversation);
    
    this.logger.log(`Conversa atualizada: ${id}`);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const conversation = await this.findOne(id);
    
    conversation.deleted = true;
    conversation.deletedAt = new Date();
    
    await this.conversationsRepository.save(conversation);
    this.logger.log(`Conversa deletada (soft delete): ${id}`);
  }

  async restore(id: string): Promise<Conversation> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id },
    });
    
    if (!conversation) {
      throw new NotFoundException(`Conversa com ID ${id} não encontrada`);
    }

    if (!conversation.deleted) {
      return conversation;
    }

    conversation.deleted = false;
    conversation.deletedAt = undefined;
    
    const restored = await this.conversationsRepository.save(conversation);
    this.logger.log(`Conversa restaurada: ${id}`);
    return restored;
  }

  async findAllDeleted(): Promise<Conversation[]> {
    return this.conversationsRepository.find({
      where: { deleted: true },
      order: { deletedAt: 'DESC' },
    });
  }
}
