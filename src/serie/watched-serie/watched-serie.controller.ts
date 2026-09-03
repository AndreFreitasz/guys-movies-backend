import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WatchedSerieService } from './watched-serie.service';
import { WatchedSeasonService } from './watched-season.service';
import { IsWatchedSerieDto } from '../dto/is-watched-serie.dto';
import { GetRateSerieDto } from '../dto/get-rate-serie.dto';
import { MarkWatchedSerieDto } from '../dto/mark-watched-serie.dto';
import { MarkSeasonDto } from '../dto/mark-season.dto';
import { UnmarkSeasonDto } from '../dto/unmark-season.dto';
import { CompleteSerieDto } from '../dto/complete-serie.dto';
import { RateSerieDto } from '../dto/rate-serie.dto';
import { UpdateWatchedAtSerieDto } from '../dto/update-watched-at-serie.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('watchedSerie')
@UseGuards(JwtAuthGuard)
export class WatchedSerieController {
  constructor(
    private readonly watchedSerieService: WatchedSerieService,
    private readonly watchedSeasonService: WatchedSeasonService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async markAsWatched(
    @CurrentUser('id') userId: number,
    @Body() body: MarkWatchedSerieDto,
  ) {
    const message = await this.watchedSerieService.markAsWatched(
      new Date(body.watchedAt),
      userId,
      body.createSerieDto,
    );
    return { message, unmarked: message === 'Série desmarcada com sucesso' };
  }

  @Get('list')
  async list(@CurrentUser('id') userId: number) {
    return this.watchedSerieService.listWatchedSeries(userId);
  }

  @Get('isWatched')
  async isWatched(
    @CurrentUser('id') userId: number,
    @Query() query: IsWatchedSerieDto,
  ) {
    return this.watchedSerieService.isWatchedSerie(userId, query.idTmdb);
  }

  @Patch('watchedAt')
  @HttpCode(HttpStatus.OK)
  async updateWatchedAt(
    @CurrentUser('id') userId: number,
    @Body() body: UpdateWatchedAtSerieDto,
  ) {
    return this.watchedSerieService.updateWatchedAt(
      userId,
      body.idTmdb,
      body.watchedAt ?? null,
    );
  }

  @Post('rate')
  @HttpCode(HttpStatus.OK)
  async rateSerie(
    @CurrentUser('id') userId: number,
    @Body() body: RateSerieDto,
  ) {
    return this.watchedSerieService.rateSerie(
      userId,
      body.idTmdb,
      body.rating,
      body.createSerieDto,
    );
  }

  @Get('getRate')
  async getRate(
    @CurrentUser('id') userId: number,
    @Query() query: GetRateSerieDto,
  ) {
    const rate = await this.watchedSerieService.getSerieRating(
      userId,
      query.idTmdb,
    );
    return { rate };
  }

  @Post('season')
  @HttpCode(HttpStatus.OK)
  async markSeason(
    @CurrentUser('id') userId: number,
    @Body() body: MarkSeasonDto,
  ) {
    return this.watchedSeasonService.markSeason(
      userId,
      body.idTmdb,
      body.seasonNumber,
      body.watchedAt ?? null,
      body.createSerieDto,
    );
  }

  @Delete('season')
  @HttpCode(HttpStatus.OK)
  async unmarkSeason(
    @CurrentUser('id') userId: number,
    @Body() body: UnmarkSeasonDto,
  ) {
    return this.watchedSeasonService.unmarkSeason(
      userId,
      body.idTmdb,
      body.seasonNumber,
    );
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeSerie(
    @CurrentUser('id') userId: number,
    @Body() body: CompleteSerieDto,
  ) {
    return this.watchedSeasonService.completeSerie(
      userId,
      body.idTmdb,
      body.completedAt ?? null,
      body.createSerieDto,
    );
  }
}
