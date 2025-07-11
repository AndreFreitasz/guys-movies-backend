import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchedSerieService } from './watched-serie.service';
import { WatchedSerieController } from './watched-serie.controller';
import { Series } from '../entities/series.entity';
import { WatchedSerie } from '../entities/watched-serie.entity';
import { User } from 'src/users/entities/user.entity';
import { CreatedSerieModule } from '../created-serie/created-serie.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WatchedSerie, User, Series]),
    CreatedSerieModule
  ],
  controllers: [WatchedSerieController],
  providers: [WatchedSerieService],
  exports: [WatchedSerieService],
})
export class WatchedSerieModule {}
