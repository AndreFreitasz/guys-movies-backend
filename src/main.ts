import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from "helmet";
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.APP_PORT || 3000);

  if(process.env.NODE_ENV === "production") {
    console.log("Production mode enabled");
    app.use(helmet());
    app.enableCors({
      origin: "https://guys-movies-frontend.vercel.app"
    });
  }
}
bootstrap();
