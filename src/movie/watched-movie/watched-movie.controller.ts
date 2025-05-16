import { Body, Controller, Get, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { WatchedMovieService } from './watched-movie.service';
import { Response } from 'express';
import { CreatedMovieDto } from '../dto/created-movie.dto';
import { IsWatchedMovieDto } from '../dto/is-watched.dto';

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
    const watched = await this.watchedMovieService.isWatchedMovie(query.userId, query.movieId);
    return res.status(HttpStatus.OK).json({ watched });
  }
}
