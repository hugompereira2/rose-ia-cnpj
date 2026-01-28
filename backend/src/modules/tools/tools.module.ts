import { Module } from '@nestjs/common';
import { FetchCnpjTool } from './fetch-cnpj.tool';
import { WebSearchTool } from './web-search.tool';
import { CacheServiceModule } from '../cache/cache.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [CacheServiceModule, LoggingModule],
  providers: [FetchCnpjTool, WebSearchTool],
  exports: [FetchCnpjTool, WebSearchTool],
})
export class ToolsModule {}
