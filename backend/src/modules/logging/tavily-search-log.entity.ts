import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('tavily_search_logs')
@Index(['requestId'])
@Index(['searchTerm'])
@Index(['createdAt'])
export class TavilySearchLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'varchar', length: 100, nullable: true })
  requestId?: string;

  @Column({ name: 'conversation_id', type: 'varchar', nullable: true })
  conversationId?: string;

  @Column({ name: 'search_term', type: 'varchar', length: 500 })
  searchTerm: string;

  @Column({ name: 'razao_social', type: 'varchar', length: 500, nullable: true })
  razaoSocial?: string;

  @Column({ name: 'nome_fantasia', type: 'varchar', length: 500, nullable: true })
  nomeFantasia?: string;

  @Column({ type: 'integer', default: 0 })
  resultsCount: number;

  @Column({ type: 'jsonb', nullable: true })
  results?: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
  }>;

  @Column({ type: 'boolean', default: false })
  fromCache: boolean;

  @Column({ type: 'integer', nullable: true })
  durationMs?: number;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
