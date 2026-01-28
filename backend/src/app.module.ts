import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentModule } from './modules/agent/agent.module';
import { ToolsModule } from './modules/tools/tools.module';
import { CacheServiceModule } from './modules/cache/cache.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { LoggingModule } from './modules/logging/logging.module';
import { Conversation } from './modules/conversations/conversation.entity';
import { Message } from './modules/logging/message.entity';
import { AgentExecutionLog } from './modules/logging/agent-execution-log.entity';
import { TavilySearchLog } from './modules/logging/tavily-search-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = {
          type: 'postgres' as const,
          host: configService.get<string>('POSTGRES_HOST') || 'localhost',
          port: configService.get<number>('POSTGRES_PORT') || 5432,
          username: configService.get<string>('POSTGRES_USER') || 'postgres',
          password: configService.get<string>('POSTGRES_PASSWORD') || 'postgres',
          database: configService.get<string>('POSTGRES_DB') || 'rose_cnpj',
          entities: [Conversation, Message, AgentExecutionLog, TavilySearchLog],
          synchronize: true, // Criar/atualizar tabelas automaticamente
          logging: true, // Logar queries SQL para debug
        };
        
        console.log('🔌 Configuração do banco de dados:');
        console.log(`   Host: ${dbConfig.host}`);
        console.log(`   Port: ${dbConfig.port}`);
        console.log(`   Database: ${dbConfig.database}`);
        console.log(`   Username: ${dbConfig.username}`);
        console.log(`   Synchronize: ${dbConfig.synchronize}`);
        console.log(`   Entities: ${dbConfig.entities.length} entidade(s)`);
        
        return dbConfig;
      },
      inject: [ConfigService],
    }),
    CacheServiceModule,
    ToolsModule,
    AgentModule,
    ConversationsModule,
    LoggingModule,
  ],
})
export class AppModule {}
