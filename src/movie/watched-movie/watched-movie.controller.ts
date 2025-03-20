import { Body, Controller, Delete, Post } from '@nestjs/common';
import { WatchedMovieService } from './watched-movie.service';
import { CreatedMovieDto } from '../dto/created-movie.dto';

@Controller('watchedMovie')
export class WatchedMovieController {
  constructor(private readonly watchedMovieService: WatchedMovieService) {}

  @Post()
  async markAsWatched(
    @Body()
    {
      watchedAt,
      userId,
      createMovieDto,
    }: {
      watchedAt: Date;
      userId: number;
      createMovieDto: CreatedMovieDto;
    },
  ) {
    return this.watchedMovieService.markAsWatched(
      watchedAt,
      userId,
      createMovieDto,
    );
  }
}
