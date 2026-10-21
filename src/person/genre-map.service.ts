import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { TtlCache } from '../common/ttl-cache';

export interface GenreMap {
  movie: Map<number, string>;
  tv: Map<number, string>;
}

interface GenreListResponse {
  genres: { id: number; name: string }[];
}

const GENRE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class GenreMapService {
  private readonly apiKey = process.env.TMDB_API_KEY;
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly cache = new TtlCache<GenreMap>(GENRE_TTL_MS, 4);

  private async fetchList(path: string): Promise<Map<number, string>> {
    const response = await axios.get<GenreListResponse>(
      `${this.baseUrl}${path}?api_key=${this.apiKey}&language=pt-BR`,
      { timeout: 8000 },
    );

    return new Map(
      (response.data?.genres ?? []).map((genre) => [genre.id, genre.name]),
    );
  }

  async resolve(): Promise<GenreMap> {
    return this.cache.resolve('all', async () => {
      const [movie, tv] = await Promise.all([
        this.fetchList('/genre/movie/list'),
        this.fetchList('/genre/tv/list'),
      ]);

      return { movie, tv };
    });
  }
}
