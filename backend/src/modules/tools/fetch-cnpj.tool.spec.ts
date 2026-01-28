import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FetchCnpjTool } from './fetch-cnpj.tool';
import { CacheService } from '../cache/cache.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FetchCnpjTool', () => {
  let service: FetchCnpjTool;
  let cacheService: CacheService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FetchCnpjTool,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BRASIL_API_URL') {
                return 'https://brasilapi.com.br/api/cnpj/v1';
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
            generateKey: jest.fn((prefix, id) => `${prefix}:${id}`),
          },
        },
      ],
    }).compile();

    service = module.get<FetchCnpjTool>(FetchCnpjTool);
    cacheService = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('fetch', () => {
    it('deve retornar dados do cache se existirem', async () => {
      const cnpj = '12345678000190';
      const cachedData = {
        razaoSocial: 'Empresa Teste',
        situacao: 'ATIVA',
        cnae: '1234-5/67 - Atividade',
        endereco: 'Rua Teste, 123',
      };

      (cacheService.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await service.fetch(cnpj);

      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalled();
      expect(mockedAxios.create().get).not.toHaveBeenCalled();
    });

    it('deve buscar dados da API se não houver cache', async () => {
      const cnpj = '12345678000190';
      const apiResponse = {
        razao_social: 'Empresa Teste LTDA',
        nome_fantasia: 'Empresa Teste',
        descricao_situacao_cadastral: 'ATIVA',
        cnae_fiscal_principal: {
          codigo: '1234-5/67',
          descricao: 'Atividade de teste',
        },
        logradouro: 'Rua Teste',
        numero: '123',
        bairro: 'Centro',
        municipio: 'São Paulo',
        uf: 'SP',
        cep: '01234-567',
      };

      (cacheService.get as jest.Mock).mockResolvedValue(undefined);
      mockedAxios.create().get = jest.fn().mockResolvedValue({
        data: apiResponse,
      });

      const result = await service.fetch(cnpj);

      expect(result.razaoSocial).toBe('Empresa Teste LTDA');
      expect(result.nomeFantasia).toBe('Empresa Teste');
      expect(result.situacao).toBe('ATIVA');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('deve limpar CNPJ antes de buscar', async () => {
      const cnpj = '12.345.678/0001-90';
      (cacheService.get as jest.Mock).mockResolvedValue(undefined);
      mockedAxios.create().get = jest.fn().mockResolvedValue({
        data: { razao_social: 'Teste' },
      });

      await service.fetch(cnpj);

      expect(mockedAxios.create().get).toHaveBeenCalledWith(
        expect.stringContaining('12345678000190'),
      );
    });

    it('deve lançar erro se a API falhar', async () => {
      const cnpj = '12345678000190';
      (cacheService.get as jest.Mock).mockResolvedValue(undefined);
      mockedAxios.create().get = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(service.fetch(cnpj)).rejects.toThrow('Falha ao buscar dados do CNPJ');
    });
  });
});
