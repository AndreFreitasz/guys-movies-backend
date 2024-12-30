import { Controller, Get, Param, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('popular')
  getTopMovies() {
    return this.moviesService.getTopMovies();
  }

  @Get('popularByProviders')
  getAllTopMoviesProviders() {
    return this.moviesService.getAllTopMoviesByProviders();
  }

  @Get('popularByGenres/:genreId')
  getTopMoviesByGenres(@Param('genreId') genreId: number) {
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
