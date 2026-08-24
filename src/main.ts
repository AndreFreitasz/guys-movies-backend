import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

dotenv.config();

function resolveCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS;
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
  }

  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://guys-movies-frontend.vercel.app',
  ];
}

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  if (isProduction) {
    app.use(helmet());
  }

  app.enableCors({
    origin: resolveCorsOrigins(),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3005;

  await app.listen(port, '0.0.0.0');
  console.log(
    `Nest server listening on 0.0.0.0:${port} (${process.env.NODE_ENV ?? 'development'})`,
  );
}
bootstrap();
