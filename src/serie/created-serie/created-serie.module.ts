import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreatedSerieService } from './created-serie.service';
import { CreatedSerieController } from './created-serie.controller';
import { Series } from '../entities/series.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Series])],
  controllers: [CreatedSerieController],
  providers: [CreatedSerieService],
  exports: [CreatedSerieService],
})
export class CreatedSerieModule {}
