import 'reflect-metadata';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(helmet());
  app.enableShutdownHooks();

  // Preserve the existing TCE/Media auth API contract at /auth/*.
  // Keep operational endpoints under /api/* for health/readiness probes.
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'auth/{*path}', method: RequestMethod.ALL }],
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }));

  const origins = (process.env.CORS_ORIGINS ?? '').split(',').map((v) => v.trim()).filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });
  await app.listen(Number(process.env.PORT ?? 4010), '0.0.0.0');
}
void bootstrap();
