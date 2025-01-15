import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MoviesModule } from 'src/movies/movies.module';
import * as dotenv from 'dotenv';
import { SeriesModule } from 'src/series/series.module';

dotenv.config();

@Module({
  imports: [
    MoviesModule,
    SeriesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
