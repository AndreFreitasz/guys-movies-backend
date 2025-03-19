import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreatedMovieService } from './created-movie.service';
import { CreatedMovieController } from './created-movie.controller';
import { Movies } from '../entities/movies.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Movies])],
  controllers: [CreatedMovieController],
  providers: [CreatedMovieService],
  exports: [CreatedMovieService],
})
export class CreatedMovieModule {}