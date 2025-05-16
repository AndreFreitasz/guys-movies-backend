import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { WatchedMovieService } from './watched-movie.service';
import { Response } from 'express';
import { CreatedMovieDto } from '../dto/created-movie.dto';

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
}
