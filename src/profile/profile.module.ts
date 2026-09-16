import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { TimelineService } from './timeline.service';
import { User } from '../users/entities/user.entity';
import { Follow } from '../users/entities/follow.entity';
import { FavoriteTitle } from '../users/entities/favorite-title.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';
import { MovieModule } from '../movie/movie.module';
import { SerieModule } from '../serie/serie.module';
import { CoverCatalogService } from './cover-catalog.service';
import { AvatarService } from './avatar.service';
import { AvatarController } from './avatar.controller';
import { UserAvatar } from '../users/entities/user-avatar.entity';
import { WatchTogether } from '../users/entities/watch-together.entity';
import { WatchTogetherService } from './watch-together.service';
import { WatchTogetherController } from './watch-together.controller';

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
      UserAvatar,
      WatchTogether,
    ]),
    MovieModule,
    SerieModule,
  ],
  controllers: [
    ProfileController,
    AvatarController,
    WatchTogetherController,
  ],
  providers: [
    ProfileService,
    TimelineService,
    CoverCatalogService,
    AvatarService,
    WatchTogetherService,
  ],
  exports: [AvatarService, WatchTogetherService],
})
export class ProfileModule {}
