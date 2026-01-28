import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service';
import { FetchCnpjTool } from '../tools/fetch-cnpj.tool';
import { WebSearchTool } from '../tools/web-search.tool';
import { AgentGraph } from './agent.graph';
import { AgentState } from './agent.state';

jest.mock('./agent.graph');

describe('AgentService', () => {
  let service: AgentService;
  let fetchCnpjTool: FetchCnpjTool;
  let webSearchTool: WebSearchTool;
  let mockGraph: jest.Mocked<AgentGraph>;

  beforeEach(async () => {
    mockGraph = {
      run: jest.fn(),
    } as any;

    (AgentGraph as jest.Mock).mockImplementation(() => mockGraph);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: FetchCnpjTool,
          useValue: {
            fetch: jest.fn(),
          },
        },
        {
          provide: WebSearchTool,
          useValue: {
            search: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'LLM_PROVIDER') return 'openai';
              if (key === 'OPENAI_API_KEY') return 'test-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
    fetchCnpjTool = module.get<FetchCnpjTool>(FetchCnpjTool);
    webSearchTool = module.get<WebSearchTool>(WebSearchTool);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('enrichCnpj', () => {
    it('deve enriquecer CNPJ com sucesso', async () => {
      const finalState = {
        cnpj: '12345678000190',
        dadosOficiais: {
          razaoSocial: 'Empresa Teste',
          situacao: 'ATIVA',
          cnae: '1234-5/67',
          endereco: 'Rua Teste, 123',
        },
        digitalPresence: {
          site: 'https://teste.com',
          email: null,
          instagram: null,
          logo: null,
        },
        fontes: ['https://brasilapi.com.br', 'https://teste.com'],
        requestId: 'test-id',
      };

      mockGraph.run.mockResolvedValue(finalState);

      const result = await service.enrichCnpj('12.345.678/0001-90');

      expect(result.cnpj).toBe('12345678000190');
      expect(result.razaoSocial).toBe('Empresa Teste');
      expect(result.site).toBe('https://teste.com');
      expect(mockGraph.run).toHaveBeenCalled();
    });

    it('deve limpar CNPJ antes de processar', async () => {
      const finalState: AgentState = {
        cnpj: '12345678000190',
        dadosOficiais: {
          razaoSocial: 'Empresa Teste',
          situacao: 'ATIVA',
          cnae: '1234-5/67',
          endereco: 'Rua Teste, 123',
        },
        fontes: [],
        requestId: 'test-id',
      };

      mockGraph.run.mockResolvedValue(finalState);

      await service.enrichCnpj('12.345.678/0001-90');

      expect(mockGraph.run).toHaveBeenCalledWith(
        expect.objectContaining({
          cnpj: '12345678000190',
        }),
      );
    });

    it('deve lançar erro se o grafo falhar', async () => {
      mockGraph.run.mockRejectedValue(new Error('Graph error'));

      await expect(service.enrichCnpj('12345678000190')).rejects.toThrow();
    });
  });
});
