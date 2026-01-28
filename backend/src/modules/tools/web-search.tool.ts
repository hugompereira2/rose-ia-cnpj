import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CacheService } from '../cache/cache.service';
import { LoggingService } from '../logging/logging.service';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

@Injectable()
export class WebSearchTool {
  private readonly logger = new Logger(WebSearchTool.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.tavily.com/search';

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly loggingService: LoggingService,
  ) {
    this.apiKey = this.configService.get<string>('TAVILY_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('TAVILY_API_KEY não configurada');
    }

    this.axiosInstance = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async search(
    razaoSocial: string,
    nomeFantasia?: string,
    requestId?: string,
    conversationId?: string,
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    const searchTerms = nomeFantasia
      ? `${razaoSocial} OR ${nomeFantasia}`
      : razaoSocial;

    if (!this.apiKey) {
      this.logger.warn('Tavily API key não configurada, retornando array vazio');
      
      // Log mesmo quando não há API key
      await this.loggingService.logTavilySearch({
        requestId,
        conversationId,
        searchTerm: searchTerms,
        razaoSocial,
        nomeFantasia,
        resultsCount: 0,
        fromCache: false,
        durationMs: Date.now() - startTime,
        success: false,
        error: 'TAVILY_API_KEY não configurada',
      });

      return [];
    }

    const cacheKey = this.cacheService.generateKey('web_search', searchTerms);

    // Verificar cache
    const cached = await this.cacheService.get<SearchResult[]>(cacheKey);
    if (cached) {
      // Aplicar filtro de score >= 0.8 também no cache
      const filteredCached = cached
        .filter((result) => (result.score || 0) >= 0.8)
        .sort((a, b) => (b.score || 0) - (a.score || 0));
      
      this.logger.log(`Resultados de busca para "${searchTerms}" encontrados no cache: ${filteredCached.length} com score >= 0.8 (de ${cached.length} total)`);
      
      // Log de cache hit
      await this.loggingService.logTavilySearch({
        requestId,
        conversationId,
        searchTerm: searchTerms,
        razaoSocial,
        nomeFantasia,
        resultsCount: filteredCached.length,
        results: filteredCached,
        fromCache: true,
        durationMs: Date.now() - startTime,
        success: true,
      });

      return filteredCached;
    }

    try {
      this.logger.log(`Buscando presença digital para: ${searchTerms}`);

      const queries = this.buildQueries(razaoSocial, nomeFantasia);
      const allResults: SearchResult[] = [];

      for (const query of queries) {
        const response = await this.axiosInstance.post(
          this.apiUrl,
          {
            api_key: this.apiKey,
            query,
            search_depth: 'basic',
            max_results: 10,
            include_domains: [],
            exclude_domains: [
              'linkedin.com',
              'facebook.com',
              'reclameaqui.com.br',
              'paginasamarelas.com.br',
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (response.data?.results) {
          const results: SearchResult[] = response.data.results
            .map((item: any) => ({
              title: item.title || '',
              url: item.url || '',
              content: item.content || '',
              score: item.score || 0,
            }))
            // Filtrar apenas resultados com score >= 0.8
            .filter((result: SearchResult) => (result.score || 0) >= 0.8);

          allResults.push(...results);
        }
      }

      // Remover duplicatas por URL e ordenar por score (maior primeiro)
      const uniqueResults = this.removeDuplicates(allResults)
        .sort((a, b) => (b.score || 0) - (a.score || 0));
      const durationMs = Date.now() - startTime;
      
      this.logger.log(`Resultados filtrados: ${uniqueResults.length} com score >= 0.8 (de ${allResults.length} total)`);

      // Cache moderado: 6 horas
      await this.cacheService.set(cacheKey, uniqueResults, 21600);

      this.logger.log(`Encontrados ${uniqueResults.length} resultados únicos`);

      // Log da busca
      await this.loggingService.logTavilySearch({
        requestId,
        conversationId,
        searchTerm: searchTerms,
        razaoSocial,
        nomeFantasia,
        resultsCount: uniqueResults.length,
        results: uniqueResults,
        fromCache: false,
        durationMs,
        success: true,
      });

      return uniqueResults;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error(`Erro ao buscar na Tavily:`, error);

      // Log do erro
      await this.loggingService.logTavilySearch({
        requestId,
        conversationId,
        searchTerm: searchTerms,
        razaoSocial,
        nomeFantasia,
        resultsCount: 0,
        fromCache: false,
        durationMs,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      // Não falhar completamente, retornar array vazio
      return [];
    }
  }

  private buildQueries(razaoSocial: string, nomeFantasia?: string): string[] {
    const queries: string[] = [];

    // Query principal com razão social
    queries.push(`site oficial ${razaoSocial}`);
    queries.push(`${razaoSocial} contato email`);

    if (nomeFantasia) {
      queries.push(`site oficial ${nomeFantasia}`);
      queries.push(`${nomeFantasia} instagram`);
    }

    // Query genérica para presença digital
    queries.push(`${razaoSocial} presença digital`);

    return queries;
  }

  private removeDuplicates(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      const url = result.url.toLowerCase();
      if (seen.has(url)) {
        return false;
      }
      seen.add(url);
      return true;
    });
  }
}
