import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchedSerieService } from './watched-serie.service';
import { WatchedSerieController } from './watched-serie.controller';
import { Series } from '../entities/series.entity';
import { WatchedSerie } from '../entities/watched-serie.entity';
import { WatchedSeason } from '../entities/watched-season.entity';
import { User } from 'src/users/entities/user.entity';
import { CreatedSerieModule } from '../created-serie/created-serie.module';
import { SerieModule } from '../serie.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WatchedSerie, WatchedSeason, User, Series]),
    CreatedSerieModule,
    SerieModule,
  ],
  controllers: [WatchedSerieController],
  providers: [WatchedSerieService],
  exports: [WatchedSerieService],
})
export class WatchedSerieModule {}
