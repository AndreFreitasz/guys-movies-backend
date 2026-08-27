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
import { TtlCache } from '../common/ttl-cache';

dotenv.config();

@Injectable()
export class SeriesService {
  private readonly apiKey = process.env.TMDB_API_KEY;
  private readonly listCache = new TtlCache<Series[]>(15 * 60 * 1000);
  private readonly searchCache = new TtlCache<Series[]>(5 * 60 * 1000);
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

  private formatSeries(series: SeriesRaw): Series {
    return {
      ...series,
      poster_url: `${this.imageBaseUrl}${series.poster_path}`,
      vote_average:
        series.vote_average !== undefined
          ? parseFloat(series.vote_average.toFixed(1))
          : null,
      first_air_date: series.first_air_date
        ? format(new Date(series.first_air_date), 'dd/MM/yyyy')
        : null,
    };
  }

  private removedSeriesAsian(series: Series[]): Series[] {
    const filters = {
      japaneseSeries: 'ja',
      koreanSeries: 'ko',
      thaiSeries: 'th',
    };
    const excludedSeries = {};
    for (const [key, value] of Object.entries(filters)) {
      excludedSeries[key] = series.filter(
        serie => serie.original_language === value,
      );
    }

    return series.filter(
      serie => !Object.values(filters).includes(serie.original_language),
    );
  }

  private async fetchFromApiSeries(url: string): Promise<Series[]> {
    const response = await axios.get<ApiResponse<SeriesRaw>>(url, {
      timeout: 8000,
    });
    const dataSeries = response.data;
    const series: Series[] = dataSeries.results.map((item: SeriesRaw) =>
      this.formatSeries(item),
    );

    return series;
  }

  async getTopSeries(): Promise<Series[]> {
    try {
      return await this.listCache.resolve('popular', () =>
        this.fetchFromApiSeries(
          `${this.baseUrl}/tv/popular?api_key=${this.apiKey}&language=pt-BR&region=BR`,
        ),
      );
    } catch (error) {
      console.error('Error fetching top series:', error);
      throw new HttpException(
        `Failed to fetch top series: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getTopSeriesProvider(providerId: number): Promise<Series[]> {
    return this.listCache.resolve(`provider:${providerId}`, () =>
      this.fetchFromApiSeries(
        `${this.baseUrl}/discover/tv?api_key=${this.apiKey}&language=pt-BR&region=BR&with_watch_providers=${providerId}&watch_region=BR&sort_by=popularity.desc`,
      ),
    );
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

  async getTopSeriesByGenres(genreId: string): Promise<Series[]> {
    const safeGenreId = String(genreId).replace(/[^0-9,]/g, '');
    if (!safeGenreId) {
      throw new HttpException('Gênero inválido', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.listCache.resolve(`genre:${safeGenreId}`, async () => {
        const buildUrl = (page: number) =>
          `${this.baseUrl}/discover/tv?api_key=${this.apiKey}&language=pt-BR&region=BR` +
          `&with_genres=${safeGenreId}&without_genres=16` +
          `&sort_by=vote_average.desc&vote_count.gte=300&page=${page}`;

        const [seriesPage1, seriesPage2] = await Promise.all([
          this.fetchFromApiSeries(buildUrl(1)),
          this.fetchFromApiSeries(buildUrl(2)),
        ]);

        return this.removedSeriesAsian([...seriesPage1, ...seriesPage2]);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to fetch top series by genre: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTopRatedSeries(): Promise<Series[]> {
    try {
      return await this.listCache.resolve('topRated', () =>
        this.fetchFromApiSeries(
          `${this.baseUrl}/discover/tv?api_key=${this.apiKey}&language=pt-BR&region=BR&sort_by=vote_average.desc&vote_count.gte=1500`,
        ),
      );
    } catch (error) {
      throw new HttpException(
        `Failed to fetch top rated series: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchSeries(query: string): Promise<Series[]> {
    if (!query?.trim()) return [];

    try {
      return await this.searchCache.resolve(
        query.trim().toLowerCase(),
        async () => {
          const series = await this.fetchFromApiSeries(
            `${this.baseUrl}/search/tv?api_key=${this.apiKey}&language=pt-BR&query=${encodeURIComponent(query)}`,
          );

          return series
            .filter(item => item.name)
            .sort(
              (seriesA, seriesB) => seriesB.popularity - seriesA.popularity,
            );
        },
      );
    } catch (error) {
      throw new HttpException(
        `Failed to search series: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
