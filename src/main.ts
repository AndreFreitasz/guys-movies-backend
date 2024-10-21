import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import * as dotenv from 'dotenv';
import helmet from "helmet";

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if(process.env.NODE_ENV === "production") {
    console.log("Production mode enabled");
    app.use(helmet());
    app.enableCors();
  }

  app.listen(process.env.PORT || 3001, function(){
    console.log("Nest server listening");
  });
}
bootstrap();
