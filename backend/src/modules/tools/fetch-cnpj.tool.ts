import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CacheService } from '../cache/cache.service';

export interface CnpjData {
  razaoSocial: string;
  nomeFantasia?: string;
  situacao: string;
  cnae: string;
  endereco: string;
}

@Injectable()
export class FetchCnpjTool {
  private readonly logger = new Logger(FetchCnpjTool.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.apiUrl =
      this.configService.get<string>('BRASIL_API_URL') ||
      'https://brasilapi.com.br/api/cnpj/v1';
    this.axiosInstance = axios.create({
      timeout: 10000,
    });
  }

  async fetch(cnpj: string): Promise<CnpjData> {
    const cleanCnpj = this.cleanCnpj(cnpj);
    const cacheKey = this.cacheService.generateKey('cnpj', cleanCnpj);

    // Verificar cache primeiro
    const cached = await this.cacheService.get<CnpjData>(cacheKey);
    if (cached) {
      this.logger.log(`CNPJ ${cleanCnpj} encontrado no cache`);
      return cached;
    }

    try {
      this.logger.log(`Buscando dados do CNPJ ${cleanCnpj} na BrasilAPI`);
      const response = await this.axiosInstance.get(`${this.apiUrl}/${cleanCnpj}`);

      const data = response.data;
      const cnpjData: CnpjData = {
        razaoSocial: data.razao_social || data.razaoSocial || '',
        nomeFantasia: data.nome_fantasia || data.nomeFantasia,
        situacao: data.descricao_situacao_cadastral || data.situacao || 'DESCONHECIDA',
        cnae: this.extractMainCnae(data),
        endereco: this.formatAddress(data),
      };

      // Cache agressivo: 24 horas
      await this.cacheService.set(cacheKey, cnpjData, 86400);

      return cnpjData;
    } catch (error) {
      this.logger.error(`Erro ao buscar CNPJ ${cleanCnpj}:`, error);
      throw new Error(`Falha ao buscar dados do CNPJ: ${error.message}`);
    }
  }

  private cleanCnpj(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  }

  private extractMainCnae(data: any): string {
    if (data.cnae_fiscal_principal) {
      const cnae = data.cnae_fiscal_principal;
      return `${cnae.codigo} - ${cnae.descricao}`;
    }
    if (data.cnae_principal) {
      return data.cnae_principal;
    }
    return 'NÃO INFORMADO';
  }

  private formatAddress(data: any): string {
    const parts = [];
    if (data.logradouro) parts.push(data.logradouro);
    if (data.numero) parts.push(data.numero);
    if (data.complemento) parts.push(data.complemento);
    if (data.bairro) parts.push(data.bairro);
    if (data.municipio) parts.push(data.municipio);
    if (data.uf) parts.push(data.uf);
    if (data.cep) parts.push(`CEP: ${data.cep}`);

    return parts.join(', ') || 'ENDEREÇO NÃO INFORMADO';
  }
}
