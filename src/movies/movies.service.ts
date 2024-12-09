import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

@Injectable()
export class MoviesService {
  private readonly apiKey = process.env.TMDB_API_KEY;
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

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
      const urlTopMovies = `${this.baseUrl}/movie/popular?api_key=${this.apiKey}&language=pt-BR&region=BR`;
      const topMovies = await this.fetchFromApiMovies(urlTopMovies);

      return topMovies;
    } catch (error) {
      console.error('Error fetching top movies:', error);
      throw new HttpException(
        `Failed to fetch top movies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getTopMoviesProvider(providerId: number) {
    const topMoviesPopularUrl = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&with_watch_providers=${providerId}&watch_region=BR&sort_by=popularity.desc`;

    const topMoviesProviders = await this.fetchFromApiMovies(topMoviesPopularUrl);
    return topMoviesProviders;
  }

  async getAllTopMoviesByProviders() {
    try {
      const providersUrl = `${this.baseUrl}/watch/providers/movie?api_key=${this.apiKey}&language=pt-BR&watch_region=BR`;
      const providers = await this.fetchFromApiMovies(providersUrl);
      const limitedProviders = providers.slice(0, 11);
      const providersToRemove = [167, 47, 350];

      const filteredProviders = limitedProviders.filter(
        (provider: any) => !providersToRemove.includes(provider.provider_id),
      );

      const allMoviesProviders = await Promise.all(
        filteredProviders.map((provider: any) =>
          this.getTopMoviesProvider(provider.provider_id).then(movies => ({
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
      const genreUrlPage1 = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=popularity.desc&with_genres=${genreId}&page=1`;
      const genreUrlPage2 = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=popularity.desc&with_genres=${genreId}&page=2`;

      const [moviesPage1, moviesPage2] = await Promise.all([
        this.fetchFromApiMovies(genreUrlPage1),
        this.fetchFromApiMovies(genreUrlPage2),
      ]);

      const moviesPopularByGenre = [...moviesPage1, ...moviesPage2];
      return moviesPopularByGenre;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch top movies by genre: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTopRatedMovies() {
    try {
      const currentDate = new Date();
      const lastYear = currentDate.getFullYear();
      const startDate = `${lastYear - 1}-01-01`;
      const endDate = `${lastYear}-12-31`;

      const url = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=vote_average.desc&primary_release_date.gte=${startDate}&primary_release_date.lte=${endDate}&vote_count.gte=1500`;
      const topRatedMovies = await this.fetchFromApiMovies(url);
      return topRatedMovies;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch top rated movies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
