import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('deve retornar valor do cache', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      cacheManager.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
    });

    it('deve retornar undefined se não encontrar', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('deve salvar valor no cache com TTL padrão', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await service.set(key, value);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, 3600);
    });

    it('deve salvar valor no cache com TTL customizado', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 7200;

      await service.set(key, value, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });
  });

  describe('delete', () => {
    it('deve deletar chave do cache', async () => {
      const key = 'test-key';

      await service.delete(key);

      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });
  });

  describe('reset', () => {
    it('deve resetar todo o cache', async () => {
      await service.reset();

      expect(cacheManager.reset).toHaveBeenCalled();
    });
  });

  describe('generateKey', () => {
    it('deve gerar chave formatada', () => {
      const key = service.generateKey('prefix', 'identifier');

      expect(key).toBe('prefix:identifier');
    });
  });
});
