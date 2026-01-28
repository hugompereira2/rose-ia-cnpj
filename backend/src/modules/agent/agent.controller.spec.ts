import { Test, TestingModule } from '@nestjs/testing';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

describe('AgentController', () => {
  let controller: AgentController;
  let service: AgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [
        {
          provide: AgentService,
          useValue: {
            enrichCnpj: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AgentController>(AgentController);
    service = module.get<AgentService>(AgentService);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('enrich', () => {
    it('deve chamar service e retornar resultado', async () => {
      const dto = { cnpj: '12345678000190' };
      const expectedResult = {
        cnpj: '12345678000190',
        razaoSocial: 'Empresa Teste',
        fontes: [],
      };

      (service.enrichCnpj as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.enrichCnpj(dto);

      expect(result).toEqual(expectedResult);
      expect(service.enrichCnpj).toHaveBeenCalledWith(dto.cnpj);
    });
  });
});
