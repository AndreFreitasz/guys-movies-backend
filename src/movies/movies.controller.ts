import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { MoviesService } from './movies.service';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('popular')
  getTopMovies(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.moviesService.getTopMovies(page);
  }

  @Get('popularByProviders')
  getAllTopMoviesProviders() {
    return this.moviesService.getAllTopMoviesByProviders();
  }

  @Get('popularByGenres/:genreId')
  getTopMoviesByGenres(@Param('genreId') genreId: string) {
    return this.moviesService.getTopMoviesByGenres(genreId);
  }

  @Get('topRated')
  getTopRatedMovies() {
    return this.moviesService.getTopRatedMovies();
  }

  @Get('search')
  searchMovies(@Query('query') query: string) {
    return this.moviesService.searchMovies(query);
  }
}
