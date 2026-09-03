import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SerieService } from './serie.service';
import { SerieController } from './serie.controller';
import { WatchedSeason } from './entities/watched-season.entity';
import { WatchedSerie } from './entities/watched-serie.entity';
import { Series } from './entities/series.entity';
import { WatchedSeasonService } from './watched-serie/watched-season.service';
import { CreatedSerieModule } from './created-serie/created-serie.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WatchedSeason, WatchedSerie, Series]),
    CreatedSerieModule,
  ],
  controllers: [SerieController],
  providers: [SerieService, WatchedSeasonService],
  exports: [SerieService, WatchedSeasonService],
})
export class SerieModule {}
