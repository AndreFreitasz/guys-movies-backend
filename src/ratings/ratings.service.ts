import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { TtlCache } from '../common/ttl-cache';
import { CriticScoresDto } from './critic-scores.dto';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const REQUEST_TIMEOUT_MS = 8000;

const emptyScores = (): CriticScoresDto => ({
  rottenTomatoes: null,
  metacritic: null,
});

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);
  private readonly cache = new TtlCache<CriticScoresDto>(
    CACHE_TTL_MS,
    CACHE_MAX_ENTRIES,
  );

  private parseScore(value: string | undefined): number | null {
    if (!value) return null;
    const match = /^(\d+(?:\.\d+)?)/.exec(value.trim());
    if (!match) return null;
    const parsed = Math.round(Number.parseFloat(match[1]));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
    return parsed;
  }

  private async fetchScores(imdbId: string): Promise<CriticScoresDto> {
    const url =
      `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}` +
      `&apikey=${process.env.OMDB_API_KEY}`;

    const response = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
    const payload = response.data;

    if (!payload || payload.Response !== 'True') {
      return emptyScores();
    }

    const ratings: { Source?: string; Value?: string }[] = Array.isArray(
      payload.Ratings,
    )
      ? payload.Ratings
      : [];

    const valueOf = (source: string): string | undefined =>
      ratings.find(entry => entry.Source === source)?.Value;

    return {
      rottenTomatoes: this.parseScore(valueOf('Rotten Tomatoes')),
      metacritic: this.parseScore(valueOf('Metacritic')),
    };
  }

  async forImdbId(imdbId: string | null | undefined): Promise<CriticScoresDto> {
    if (!imdbId || !process.env.OMDB_API_KEY) {
      return emptyScores();
    }

    try {
      return await this.cache.resolve(imdbId, () => this.fetchScores(imdbId));
    } catch (error) {
      this.logger.warn(
        `Nao foi possivel obter notas externas para ${imdbId}: ${error?.message ?? error}`,
      );
      return emptyScores();
    }
  }
}
