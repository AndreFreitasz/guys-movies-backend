import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLibraryController } from './user-library.controller';
import { UserLibraryService } from './user-library.service';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WaitingMovies } from '../movie/entities/waiting-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WaitingSeries } from '../serie/entities/waiting-serie.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WatchedMovie,
      WaitingMovies,
      WatchedSerie,
      WaitingSeries,
    ]),
  ],
  controllers: [UserLibraryController],
  providers: [UserLibraryService],
})
export class UserLibraryModule {}
