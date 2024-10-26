import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

@Injectable()
export class MoviesService {
  private readonly apiKey = process.env.TMDB_API_KEY;
  private readonly baseUrl = "https://api.themoviedb.org/3";
  private readonly imageBaseUrl = "https://image.tmdb.org/t/p/w500";

  private async fetchFromApiMovies(url: string): Promise<any> {
    const response = await axios.get(url);
    const dataMovies = response.data;
    dataMovies.results = dataMovies.results.map((item: any) => ({
      ...item,
      poster_url: `${this.imageBaseUrl}${item.poster_path}`,
    }));

    return dataMovies.results;
  }

  async getTopMovies() {
    try {
      const url = `${this.baseUrl}/movie/popular?api_key=${this.apiKey}&language=pt-BR&region=BR`;
      const topMovies = await this.fetchFromApiMovies(url);

      const moviesWithImages = topMovies.results.map((movie: any) => ({
        ...movie,
        poster_url: `${this.imageBaseUrl}${movie.poster_path}`,
      }));

      return moviesWithImages;
    } catch (error) {
      console.error("Error fetching top movies:", error);
      throw new HttpException(
        `Failed to fetch top movies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getTopMoviesProvider(providerId: number) {
    const url = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&with_watch_providers=${providerId}&watch_region=BR&sort_by=popularity.desc`;

    const topMoviesProviders = await this.fetchFromApiMovies(url);
    return topMoviesProviders;
  }

  async getAllTopMoviesByProviders() {
    try {
      const providersUrl = `${this.baseUrl}/watch/providers/movie?api_key=${this.apiKey}&language=pt-BR&watch_region=BR`;
      const providers = await this.fetchFromApiMovies(providersUrl);
      const limitedProviders = providers.slice(0, 11);

      const allMoviesProviders = await Promise.all(
        limitedProviders.map((provider: any) =>
          this.getTopMoviesProvider(provider.provider_id).then((movies) => ({
            provider: {
              id: provider.provider_id,
              name: provider.provider_name,
              logoUrl: `https://image.tmdb.org/t/p/w92${provider.logo_path}`,
            },
            movies,
          })),
        ),
      );

      return allMoviesProviders;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch all top movies by providers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTopMoviesByGenres(genreId: number) {
    try {
      const genresUrl = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=popularity.desc&with_genres=${genreId}`;
      const moviesByGenre = await this.fetchFromApiMovies(genresUrl);
      return moviesByGenre;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch top movies by genre: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
