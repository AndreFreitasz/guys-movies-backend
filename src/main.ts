import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';


dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode enabled');
    app.use(helmet());
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://guys-movies-frontend.vercel.app',
      ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
  } else {
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });
  }

  app.listen(process.env.PORT || 3005, function () {
    console.log('Nest server listening');
  });
}
bootstrap();
