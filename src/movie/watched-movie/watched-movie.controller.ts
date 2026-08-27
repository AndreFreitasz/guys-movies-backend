import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WatchedMovieService } from './watched-movie.service';
import { IsWatchedMovieDto } from '../dto/is-watched.dto';
import { GetRateDto } from '../dto/get-rate.dto';
import { MarkWatchedMovieDto } from '../dto/mark-watched.dto';
import { RateMovieDto } from '../dto/rate-movie.dto';
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
    const watched = await this.watchedMovieService.isWatchedMovie(
      userId,
      query.idTmdb,
    );
    return { watched };
  }

  @Post('rate')
  @HttpCode(HttpStatus.OK)
  async rateMovie(
    @CurrentUser('id') userId: number,
    @Body() body: RateMovieDto,
  ) {
    const message = await this.watchedMovieService.rateMovie(
      userId,
      body.idTmdb,
      body.rating,
    );
    return { message };
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
