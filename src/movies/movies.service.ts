import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { Movie, MovieRaw } from './interfaces/movie.interface';
import { ApiResponse } from './interfaces/api-response.interface';
import { format } from 'date-fns';
import {
  Provider,
  ProviderRaw,
  ProviderResponse,
} from './interfaces/provider.interface';
import { TtlCache } from '../common/ttl-cache';

dotenv.config();

@Injectable()
export class MoviesService {
  private readonly apiKey = process.env.TMDB_API_KEY;
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
  private readonly listCache = new TtlCache<Movie[]>(15 * 60 * 1000);
  private readonly providerCache = new TtlCache<
    { provider: Provider; movies: Movie[] }[]
  >(30 * 60 * 1000);
  private readonly searchCache = new TtlCache<Movie[]>(5 * 60 * 1000);

  private formatMovie(movie: MovieRaw): Movie {
    return {
      ...movie,
      poster_url: `${this.imageBaseUrl}${movie.poster_path}`,
      vote_average:
        movie.vote_average !== undefined
          ? parseFloat(movie.vote_average.toFixed(1))
          : null,
      release_date: movie.release_date
        ? format(new Date(movie.release_date), 'dd/MM/yyyy')
        : null,
    };
  }

  private async fetchFromApiMovies(url: string): Promise<Movie[]> {
    const response = await axios.get<ApiResponse<MovieRaw>>(url, {
      timeout: 8000,
    });
    const dataMovies = response.data;
    const movies: Movie[] = dataMovies.results.map((item: MovieRaw) =>
      this.formatMovie(item),
    );

    return movies;
  }

  async getTopMovies(page = 1): Promise<Movie[]> {
    try {
      const safePage = Math.min(Math.max(Math.trunc(page) || 1, 1), 500);
      return await this.listCache.resolve(`popular:${safePage}`, () =>
        this.fetchFromApiMovies(
          `${this.baseUrl}/movie/popular?api_key=${this.apiKey}&language=pt-BR&region=BR&page=${safePage}`,
        ),
      );
    } catch (error) {
      console.error('Error fetching top movies:', error);
      throw new HttpException(
        `Failed to fetch top movies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getTopMoviesProvider(providerId: number): Promise<Movie[]> {
    return this.listCache.resolve(`provider:${providerId}`, () =>
      this.fetchFromApiMovies(
        `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&with_watch_providers=${providerId}&watch_region=BR&sort_by=popularity.desc`,
      ),
    );
  }

  async getAllTopMoviesByProviders(): Promise<
    { provider: Provider; movies: Movie[] }[]
  > {
    try {
      return await this.providerCache.resolve('all', async () => {
        const providersUrl = `${this.baseUrl}/watch/providers/movie?api_key=${this.apiKey}&language=pt-BR&watch_region=BR`;
        const response = await axios.get<ProviderResponse>(providersUrl);
        const providers = response.data.results;
        const limitedProviders = providers.slice(0, 11);
        const providersToRemove = [167, 47, 350];

        const filteredProviders = limitedProviders.filter(
          (provider: ProviderRaw) =>
            !providersToRemove.includes(provider.provider_id),
        );

        const allMoviesProviders = await Promise.all(
          filteredProviders.map((provider: ProviderRaw) =>
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
      });
    } catch (error) {
      throw new HttpException(
        `Failed to fetch all top movies by providers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTopMoviesByGenres(genreId: string): Promise<Movie[]> {
    const safeGenreId = String(genreId).replace(/[^0-9,]/g, '');
    if (!safeGenreId) {
      throw new HttpException('Gênero inválido', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.listCache.resolve(`genre:${safeGenreId}`, async () => {
        const genreUrlPage1 = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=popularity.desc&with_genres=${safeGenreId}&page=1`;
        const genreUrlPage2 = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=popularity.desc&with_genres=${safeGenreId}&page=2`;

        const [moviesPage1, moviesPage2] = await Promise.all([
          this.fetchFromApiMovies(genreUrlPage1),
          this.fetchFromApiMovies(genreUrlPage2),
        ]);

        return [...moviesPage1, ...moviesPage2];
      });
    } catch (error) {
      throw new HttpException(
        `Failed to fetch top movies by genre: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTopRatedMovies(): Promise<Movie[]> {
    try {
      return await this.listCache.resolve('topRated', async () => {
        const currentDate = new Date();
        const lastYear = currentDate.getFullYear();
        const startDate = `${lastYear - 1}-01-01`;
        const endDate = `${lastYear}-12-31`;

        const url = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=vote_average.desc&primary_release_date.gte=${startDate}&primary_release_date.lte=${endDate}&vote_count.gte=1500`;
        return this.fetchFromApiMovies(url);
      });
    } catch (error) {
      throw new HttpException(
        `Failed to fetch top rated movies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchMovies(query: string): Promise<Movie[]> {
    if (!query?.trim()) return [];

    try {
      return await this.searchCache.resolve(
        query.trim().toLowerCase(),
        async () => {
          const url = `${this.baseUrl}/search/movie?api_key=${this.apiKey}&language=pt-BR&query=${encodeURIComponent(query)}`;
          const response = await axios.get<ApiResponse<MovieRaw>>(url, {
            timeout: 8000,
          });
          const dataMovies = response.data;

          const searchMovies: Movie[] = dataMovies.results
            .filter((item: MovieRaw) => item.title)
            .map((item: MovieRaw) => this.formatMovie(item))
            .sort(
              (movieA: Movie, movieB: Movie) =>
                movieB.popularity - movieA.popularity,
            );

          return searchMovies;
        },
      );
    } catch (error) {
      throw new HttpException(
        `Failed to search movies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
