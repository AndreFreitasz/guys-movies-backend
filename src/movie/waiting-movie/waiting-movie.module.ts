import { Module } from '@nestjs/common';
import { WaitingMovieService } from './waiting-movie.service';
import { WaitingMovieController } from './waiting-movie.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitingMovies } from '../entities/waiting-movie.entity';
import { CreatedMovieModule } from '../created-movie/created-movie.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitingMovies]),
    CreatedMovieModule
  ],
  controllers: [WaitingMovieController],
  providers: [WaitingMovieService],
})
export class WaitingMovieModule {}
