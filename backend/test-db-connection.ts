import { DataSource } from 'typeorm';
import { Conversation } from './src/modules/conversations/conversation.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'rose_cnpj',
  entities: [Conversation],
  synchronize: false,
  logging: true,
});

async function testConnection() {
  try {
    console.log('🔄 Testando conexão com PostgreSQL...');
    console.log(`Host: ${process.env.POSTGRES_HOST || 'localhost'}`);
    console.log(`Port: ${process.env.POSTGRES_PORT || '5432'}`);
    console.log(`Database: ${process.env.POSTGRES_DB || 'rose_cnpj'}`);
    
    await dataSource.initialize();
    console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
    
    // Testar se a tabela existe
    const queryRunner = dataSource.createQueryRunner();
    const tableExists = await queryRunner.hasTable('conversations');
    
    if (tableExists) {
      console.log('✅ Tabela "conversations" existe');
    } else {
      console.log('⚠️  Tabela "conversations" não existe (será criada automaticamente em dev)');
    }
    
    await dataSource.destroy();
    console.log('✅ Teste concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao conectar com PostgreSQL:', error);
    process.exit(1);
  }
}

testConnection();
