import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { Series, SeriesRaw } from './interfaces/series.interface';
import { ApiResponse } from './interfaces/api-response.interface';
import { format } from 'date-fns';
import {
  Provider,
  ProviderRaw,
  ProviderResponse,
} from './interfaces/provider.interface';

dotenv.config();

@Injectable()
export class SeriesService {
  private readonly apiKey = process.env.TMDB_API_KEY;
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

  private formatSeries(series: SeriesRaw): Series {
    return {
      ...series,
      poster_url: `${this.imageBaseUrl}${series.poster_path}`,
      vote_average: series.vote_average !== undefined ? parseFloat(series.vote_average.toFixed(1)) : null,
      first_air_date: series.first_air_date ? format(new Date(series.first_air_date), 'dd/MM/yyyy') : null,
    };
  }

  private removedSeriesAsian(series: Series[]): Series[] {
    const filters = {
      japaneseSeries: 'ja',
      koreanSeries: 'ko',
      thaiSeries: 'th',
    }
    const excludedSeries = {};
    for (const [key, value] of Object.entries(filters)) {
      excludedSeries[key] = series.filter(serie => serie.original_language === value);
    }
  
    return series.filter(serie => !Object.values(filters).includes(serie.original_language));
  }

  private async fetchFromApiSeries(url: string): Promise<Series[]> {
    const response = await axios.get<ApiResponse<SeriesRaw>>(url);
    const dataSeries = response.data;
    const series: Series[] = dataSeries.results.map((item: SeriesRaw) =>
      this.formatSeries(item),
    );

    return series;
  }

  async getTopSeries(): Promise<Series[]> {
    try {
      const urlTopSeries = `${this.baseUrl}/tv/popular?api_key=${this.apiKey}&language=pt-BR&region=BR`;
      const topSeries = await this.fetchFromApiSeries(urlTopSeries);

      return topSeries;
    } catch (error) {
      console.error('Error fetching top series:', error);
      throw new HttpException(
        `Failed to fetch top series: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getTopSeriesProvider(providerId: number): Promise<Series[]> {
    const topSeriesPopularUrl = `${this.baseUrl}/discover/tv?api_key=${this.apiKey}&language=pt-BR&region=BR&with_watch_providers=${providerId}&watch_region=BR&sort_by=popularity.desc`;

    const topSeriesProviders =
      await this.fetchFromApiSeries(topSeriesPopularUrl);
    return topSeriesProviders;
  }

  async getAllTopSeriesByProviders(): Promise<
    { provider: Provider; series: Series[] }[]
  > {
    try {
      const providersUrl = `${this.baseUrl}/watch/providers/tv?api_key=${this.apiKey}&language=pt-BR&watch_region=BR`;
      const response = await axios.get<ProviderResponse>(providersUrl);
      const providers = response.data.results;
      const limitedProviders = providers.slice(0, 10);
      const providersToRemove = [167, 47];

      const filteredProviders = limitedProviders.filter(
        (provider: ProviderRaw) =>
          !providersToRemove.includes(provider.provider_id),
      );

      const allSeriesProviders = await Promise.all(
        filteredProviders.map((provider: ProviderRaw) =>
          this.getTopSeriesProvider(provider.provider_id).then(series => ({
            provider: {
              id: provider.provider_id,
              name: provider.provider_name,
              logoUrl: `https://image.tmdb.org/t/p/w92${provider.logo_path}`,
            },
            series,
          })),
        ),
      );

      return allSeriesProviders;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch all top series by providers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTopSeriesByGenres(genreId: number): Promise<Series[]> {
    try {
      const genreUrlPage1 = `${this.baseUrl}/discover/tv?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=popularity.desc&with_genres=${genreId}&without_genres=16&sort_by=vote_average.desc&vote_count.gte=300&page=1`;
      const genreUrlPage2 = `${this.baseUrl}/discover/tv?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=popularity.desc&with_genres=${genreId}&without_genres=16&sort_by=vote_average.desc&vote_count.gte=300&page=2`;

      const [seriesPage1, seriesPage2] = await Promise.all([
        this.fetchFromApiSeries(genreUrlPage1),
        this.fetchFromApiSeries(genreUrlPage2),
      ]);
      const seriesPopularByGenre = [...seriesPage1, ...seriesPage2];
      const filteredSeries = this.removedSeriesAsian(seriesPopularByGenre);
      return filteredSeries;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch top series by genre: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTopRatedSeries(): Promise<Series[]> {
    try {
      const currentDate = new Date();
      const lastYear = currentDate.getFullYear();

      const url = `${this.baseUrl}/discover/tv?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=vote_average.desc&vote_count.gte=1500`;
      const topRatedSeries = await this.fetchFromApiSeries(url);
      return topRatedSeries;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch top rated series: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchSeries(query: string): Promise<Series[]> {
    try {
      const url = `${this.baseUrl}/search/tv?api_key=${this.apiKey}&language=pt-BR&query=${encodeURIComponent(query)}`;
      console.log(`Fetching from URL: ${url}`);
      const response = await axios.get<ApiResponse<SeriesRaw>>(url);
      const dataSeries = response.data;

      const searchSeries: Series[] = dataSeries.results
        .filter((item: SeriesRaw) => item.name)
        .map((item: SeriesRaw) => this.formatSeries(item))
        .sort((seriesA: Series, seriesB: Series) => {
          if (seriesA.name === seriesB.name) {
            return seriesB.popularity - seriesA.popularity;
          }
          return 0;
        });

      return searchSeries;
    } catch (error) {
      throw new HttpException(
        `Failed to search series: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}