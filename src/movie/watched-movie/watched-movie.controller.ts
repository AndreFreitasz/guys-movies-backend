import { Body, Controller, Get, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { WatchedMovieService } from './watched-movie.service';
import { Response } from 'express';
import { CreatedMovieDto } from '../dto/created-movie.dto';
import { IsWatchedMovieDto } from '../dto/is-watched.dto';
import { GetRateDto } from '../dto/get-rate.dto';

@Controller('watchedMovie')
export class WatchedMovieController {
  constructor(private readonly watchedMovieService: WatchedMovieService) {}

  @Post()
  async markAsWatched(
    @Body() {watchedAt, userId, createMovieDto}: {watchedAt:Date; userId:number; createMovieDto:CreatedMovieDto;},
    @Res() res: Response,
  ) {
    const message = await this.watchedMovieService.markAsWatched(watchedAt, userId, createMovieDto);
    if (message === 'Filme desmarcado com sucesso') {
      return res.status(HttpStatus.OK).json({ message });
    }
    return res.status(HttpStatus.CREATED).json({ message });
  }

  @Get('isWatched')
  async isWatched(@Query() query: IsWatchedMovieDto, @Res() res: Response) {
    const watched = await this.watchedMovieService.isWatchedMovie(query.userId, query.idTmdb);
    return res.status(HttpStatus.OK).json({ watched });
  }

  @Post('rate')
  async rateMovie(
    @Body() { userId, idTmdb, rating }: { userId: number; idTmdb: number; rating: number },
    @Res() res: Response,
  ) {
    const message = await this.watchedMovieService.rateMovie(userId, idTmdb, rating);
    return res.status(HttpStatus.OK).json({ message });
  }

  @Get('getRate')
  async getRate(@Query() query: GetRateDto, @Res() res: Response) {
    const rate = await this.watchedMovieService.getMovieRating(query.userId, query.idTmdb);
    return res.status(HttpStatus.OK).json({ rate });
  }
}
