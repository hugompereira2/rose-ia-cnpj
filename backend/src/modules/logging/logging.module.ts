import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggingService } from './logging.service';
import { LoggingController } from './logging.controller';
import { Message } from './message.entity';
import { AgentExecutionLog } from './agent-execution-log.entity';
import { TavilySearchLog } from './tavily-search-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, AgentExecutionLog, TavilySearchLog])],
  providers: [LoggingService],
  controllers: [LoggingController],
  exports: [LoggingService],
})
export class LoggingModule {}
