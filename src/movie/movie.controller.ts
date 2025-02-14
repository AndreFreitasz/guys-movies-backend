import { Controller, Get, Param } from '@nestjs/common';
import { MovieService } from './movie.service';
import { MovieDto } from './dto/movie.dto';

@Controller('movie')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get(':idMovie')
  getMovie(@Param('idMovie') idMovie: number): Promise<MovieDto> {
    return this.movieService.getMovieData(idMovie);
  }
}
