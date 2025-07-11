import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitingSerieService } from './waiting-serie.service';
import { WaitingSerieController } from './waiting-serie.controller';
import { WaitingSeries } from '../entities/waiting-serie.entity';
import { Series } from '../entities/series.entity';
import { User } from 'src/users/entities/user.entity';
import { CreatedSerieModule } from '../created-serie/created-serie.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitingSeries, Series, User]),
    CreatedSerieModule
  ],
  controllers: [WaitingSerieController],
  providers: [WaitingSerieService],
})
export class WaitingSerieModule {}
