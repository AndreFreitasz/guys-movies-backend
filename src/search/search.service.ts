import { Injectable } from '@nestjs/common';
import { MoviesService } from '../movies/movies.service';
import { SeriesService } from '../series/series.service';
import { SearchResult } from './interfaces/search-result.interface';
import { matchLayer, normalizeForMatch } from './relevance';

@Injectable()
export class SearchService {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly seriesService: SeriesService,
  ) {}

  async searchAll(query: string): Promise<SearchResult[]> {
    if (normalizeForMatch(query ?? '').length === 0) return [];

    const [movies, series] = await Promise.all([
      this.moviesService.searchMovies(query),
      this.seriesService.searchSeries(query),
    ]);

    const movieResults: SearchResult[] = movies.map(movie => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      poster_url: movie.poster_url,
      vote_average: movie.vote_average,
      release_date: movie.release_date,
      popularity: movie.popularity,
      type: 'movie' as const,
      original_language: movie.original_language,
    }));

    const serieResults: SearchResult[] = series.map(serie => ({
      id: serie.id,
      title: serie.name,
      overview: serie.overview,
      poster_url: serie.poster_url,
      vote_average: serie.vote_average,
      release_date: serie.first_air_date,
      popularity: serie.popularity,
      type: 'serie' as const,
      original_language: serie.original_language,
    }));

    const allResults = [...movieResults, ...serieResults];

    return allResults.sort((a, b) => {
      const layerDifference =
        matchLayer(a.title, query) - matchLayer(b.title, query);
      if (layerDifference !== 0) return layerDifference;
      return b.popularity - a.popularity;
    });
  }
}
