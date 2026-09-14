import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { User } from '../users/entities/user.entity';
import { Follow } from '../users/entities/follow.entity';
import { FavoriteTitle } from '../users/entities/favorite-title.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Follow,
      FavoriteTitle,
      WatchedMovie,
      WatchedSerie,
      WatchedSeason,
      Movies,
      Series,
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
