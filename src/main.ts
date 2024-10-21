import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.listen(process.env.PORT || 3001, function(){
    console.log("Nest server listening");
  });
}
bootstrap();
