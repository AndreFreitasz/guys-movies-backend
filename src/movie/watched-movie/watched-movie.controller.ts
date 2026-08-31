import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WatchedMovieService } from './watched-movie.service';
import { IsWatchedMovieDto } from '../dto/is-watched.dto';
import { GetRateDto } from '../dto/get-rate.dto';
import { MarkWatchedMovieDto } from '../dto/mark-watched.dto';
import { RateMovieDto } from '../dto/rate-movie.dto';
import { UpdateWatchedAtDto } from '../dto/update-watched-at.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('watchedMovie')
@UseGuards(JwtAuthGuard)
export class WatchedMovieController {
  constructor(private readonly watchedMovieService: WatchedMovieService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async markAsWatched(
    @CurrentUser('id') userId: number,
    @Body() body: MarkWatchedMovieDto,
  ) {
    const message = await this.watchedMovieService.markAsWatched(
      new Date(body.watchedAt),
      userId,
      body.createMovieDto,
    );
    return { message, unmarked: message === 'Filme desmarcado com sucesso' };
  }

  @Get('list')
  async listWatched(@CurrentUser('id') userId: number) {
    return this.watchedMovieService.listWatchedMovies(userId);
  }

  @Get('isWatched')
  async isWatched(
    @CurrentUser('id') userId: number,
    @Query() query: IsWatchedMovieDto,
  ) {
    return this.watchedMovieService.isWatchedMovie(userId, query.idTmdb);
  }

  @Patch('watchedAt')
  @HttpCode(HttpStatus.OK)
  async updateWatchedAt(
    @CurrentUser('id') userId: number,
    @Body() body: UpdateWatchedAtDto,
  ) {
    return this.watchedMovieService.updateWatchedAt(
      userId,
      body.idTmdb,
      body.watchedAt ?? null,
    );
  }

  @Post('rate')
  @HttpCode(HttpStatus.OK)
  async rateMovie(
    @CurrentUser('id') userId: number,
    @Body() body: RateMovieDto,
  ) {
    return this.watchedMovieService.rateMovie(
      userId,
      body.idTmdb,
      body.rating,
      body.createMovieDto,
    );
  }

  @Get('getRate')
  async getRate(@CurrentUser('id') userId: number, @Query() query: GetRateDto) {
    const rate = await this.watchedMovieService.getMovieRating(
      userId,
      query.idTmdb,
    );
    return { rate };
  }
}
