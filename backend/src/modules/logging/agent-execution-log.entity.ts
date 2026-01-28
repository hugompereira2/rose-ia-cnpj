import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('agent_execution_logs')
@Index(['requestId'])
@Index(['cnpj'])
@Index(['createdAt'])
export class AgentExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'varchar', length: 100 })
  requestId: string;

  @Column({ type: 'varchar', length: 14, nullable: true })
  cnpj?: string;

  @Column({ name: 'conversation_id', type: 'varchar', nullable: true })
  conversationId?: string;

  @Column({ type: 'varchar', length: 50 })
  operation: 'enrich' | 'chat' | 'extract';

  @Column({ type: 'text', nullable: true })
  input?: string;

  @Column({ type: 'jsonb', nullable: true })
  output?: any;

  @Column({ type: 'jsonb', nullable: true })
  state?: any;

  @Column({ type: 'varchar', length: 50, nullable: true })
  llmProvider?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model?: string;

  @Column({ type: 'integer', nullable: true })
  tokensUsed?: number;

  @Column({ type: 'integer', nullable: true })
  durationMs?: number;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
