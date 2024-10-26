import { Controller, Get, Param, Query } from "@nestjs/common";
import { MoviesService } from "./movies.service";

@Controller("movies")
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get("popular")
  getTopMovies() {
    return this.moviesService.getTopMovies();
  }

  @Get("popularByproviders")
  getAllTopMoviesProviders() {
    return this.moviesService.getAllTopMoviesByProviders();
  }

  @Get("popularBygenres/:genreId")
  getTopMoviesByGenres(@Param("genreId") genreId: number) {
    return this.moviesService.getTopMoviesByGenres(genreId);
  }
}
