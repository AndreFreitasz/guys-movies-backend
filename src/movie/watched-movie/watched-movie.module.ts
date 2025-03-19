import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchedMovieService } from './watched-movie.service';
import { WatchedMovieController } from './watched-movie.controller';
import { Movies } from '../entities/movies.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Movies])],
  controllers: [WatchedMovieController],
  providers: [WatchedMovieService],
  exports: [WatchedMovieService],
})
export class WatchedMovieModule {}