import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WebSearchTool } from './web-search.tool';
import { CacheService } from '../cache/cache.service';
import { LoggingService } from '../logging/logging.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebSearchTool', () => {
  let service: WebSearchTool;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSearchTool,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'TAVILY_API_KEY') {
                return 'test-api-key';
              }
              return null;
            }),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            generateKey: jest.fn((prefix, id) => `web_search:${id}`),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            logMessage: jest.fn(),
            logAgentExecution: jest.fn(),
            logTavilySearch: jest.fn(),
            getMessagesByConversation: jest.fn(),
            getAgentLogs: jest.fn(),
            getTavilyLogs: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebSearchTool>(WebSearchTool);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('deve retornar array vazio se API key não estiver configurada', async () => {
      const mockLoggingService = {
        logMessage: jest.fn(),
        logAgentExecution: jest.fn(),
        logTavilySearch: jest.fn(),
        getMessagesByConversation: jest.fn(),
        getAgentLogs: jest.fn(),
        getTavilyLogs: jest.fn(),
      };
      
      const serviceWithoutKey = new WebSearchTool(
        {
          get: jest.fn(() => ''),
        } as any,
        cacheService,
        mockLoggingService as any,
      );

      const result = await serviceWithoutKey.search('Empresa Teste');

      expect(result).toEqual([]);
    });

    it('deve retornar dados do cache se existirem', async () => {
      const cachedResults = [
        {
          title: 'Site Teste',
          url: 'https://teste.com',
          content: 'Conteúdo teste',
        },
      ];

      (cacheService.get as jest.Mock).mockResolvedValue(cachedResults);

      const result = await service.search('Empresa Teste');

      expect(result).toEqual(cachedResults);
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('deve buscar na API se não houver cache', async () => {
      const apiResponse = {
        results: [
          {
            title: 'Site Teste',
            url: 'https://teste.com',
            content: 'Conteúdo teste',
            score: 0.9,
          },
        ],
      };

      (cacheService.get as jest.Mock).mockResolvedValue(undefined);
      mockedAxios.create().post = jest.fn().mockResolvedValue({
        data: apiResponse,
      });

      const result = await service.search('Empresa Teste');

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://teste.com');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('deve remover duplicatas por URL', async () => {
      const apiResponse = {
        results: [
          {
            title: 'Site 1',
            url: 'https://teste.com',
            content: 'Conteúdo 1',
          },
          {
            title: 'Site 2',
            url: 'https://teste.com',
            content: 'Conteúdo 2',
          },
        ],
      };

      (cacheService.get as jest.Mock).mockResolvedValue(undefined);
      mockedAxios.create().post = jest.fn().mockResolvedValue({
        data: apiResponse,
      });

      const result = await service.search('Empresa Teste');

      expect(result).toHaveLength(1);
    });

    it('deve retornar array vazio em caso de erro', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(undefined);
      mockedAxios.create().post = jest.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.search('Empresa Teste');

      expect(result).toEqual([]);
    });
  });
});
