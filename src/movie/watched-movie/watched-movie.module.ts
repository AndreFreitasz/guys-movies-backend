import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchedMovieService } from './watched-movie.service';
import { WatchedMovieController } from './watched-movie.controller';
import { Movies } from '../entities/movies.entity';
import { WatchedMovie } from '../entities/watched-movie.entity';
import { User } from 'src/users/entities/user.entity';
import { CreatedMovieModule } from '../created-movie/created-movie.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WatchedMovie, User, Movies]),
    CreatedMovieModule,
  ],
  controllers: [WatchedMovieController],
  providers: [WatchedMovieService],
  exports: [WatchedMovieService],
})
export class WatchedMovieModule {}
