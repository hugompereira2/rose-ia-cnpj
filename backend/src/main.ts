import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('🔄 Iniciando aplicação NestJS...');
    const app = await NestFactory.create(AppModule);
    console.log('✅ AppModule criado com sucesso');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    console.log('✅ ValidationPipe configurado');

    // Permitir múltiplas origens para desenvolvimento (Cursor pode usar portas diferentes)
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
    ];
    
    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Permitir requisições sem origin (ex: Postman, mobile apps)
        if (!origin) {
          return callback(null, true);
        }
        
        // Verificar se a origem está na lista permitida
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // Em desenvolvimento, permitir qualquer localhost
          if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Content-Type'],
    };
    
    app.enableCors(corsOptions);
    console.log('🔒 CORS configurado para:', allowedOrigins);

    const port = process.env.PORT || 3001;
    console.log(`🔄 Tentando iniciar servidor na porta ${port}...`);
    await app.listen(port);

    console.log(`🚀 Backend rodando em http://localhost:${port}`);
    console.log(`📡 Aguardando requisições do frontend`);
    console.log(`💾 Banco de dados: PostgreSQL (synchronize: true - tabelas criadas automaticamente)`);
  } catch (error) {
    console.error('❌ Erro ao iniciar aplicação:', error);
    throw error;
  }
}

bootstrap();
