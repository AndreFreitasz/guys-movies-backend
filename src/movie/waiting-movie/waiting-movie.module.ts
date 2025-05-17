import { Module } from '@nestjs/common';
import { WaitingMovieService } from './waiting-movie.service';
import { WaitingMovieController } from './waiting-movie.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [WaitingMovieController],
  providers: [WaitingMovieService],
})
export class MovieModule {}
