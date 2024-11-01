import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';
import helmet from 'helmet';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode enabled');
    app.use(helmet());
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3001', 'https://guys-movies-frontend.vercel.app'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
    });
  } else {
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
    });
  }


  app.listen(process.env.PORT || 3001, function () {
    console.log('Nest server listening');
  });
}
bootstrap();
