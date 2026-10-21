import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { TtlCache } from '../common/ttl-cache';
import { GenreMapService } from './genre-map.service';
import { normalizeCredits } from './credits';
import {
  buildStats,
  countGenres,
  pickDefaultDepartment,
  summarizeDepartments,
} from './aggregate';
import { CreditQuery, pickHighlights, queryCredits } from './query';
import {
  PersonCredit,
  PersonCreditsPage,
  PersonProfile,
  PersonSearchResult,
} from './interfaces/person.interface';

interface PersonAggregate {
  profile: Omit<PersonProfile, 'credits'>;
  credits: PersonCredit[];
}

const PERSON_TTL_MS = 6 * 60 * 60 * 1000;
const SEARCH_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class PersonService {
  private readonly apiKey = process.env.TMDB_API_KEY;
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly posterBaseUrl = 'https://image.tmdb.org/t/p/w342';
  private readonly profileBaseUrl = 'https://image.tmdb.org/t/p/w300';
  private readonly cache = new TtlCache<PersonAggregate>(PERSON_TTL_MS, 100);
  private readonly searchCache = new TtlCache<PersonSearchResult[]>(
    SEARCH_TTL_MS,
    100,
  );

  constructor(private readonly genreMapService: GenreMapService) {}

  private async fetchEnglishBiography(id: number): Promise<string | null> {
    try {
      const response = await axios.get<{ biography?: string }>(
        `${this.baseUrl}/person/${id}?api_key=${this.apiKey}&language=en-US`,
        { timeout: 8000 },
      );
      return response.data?.biography?.trim() || null;
    } catch {
      return null;
    }
  }

  private async loadAggregate(id: number): Promise<PersonAggregate> {
    try {
      return await this.cache.resolve(String(id), async () => {
        const response = await axios.get<any>(
          `${this.baseUrl}/person/${id}?api_key=${this.apiKey}&language=pt-BR` +
            `&append_to_response=combined_credits`,
          { timeout: 10000 },
        );

        const data = response.data;
        if (!data?.id) {
          throw new HttpException(
            'Pessoa não encontrada',
            HttpStatus.NOT_FOUND,
          );
        }

        const credits = normalizeCredits(
          data.combined_credits?.cast ?? [],
          data.combined_credits?.crew ?? [],
          this.posterBaseUrl,
        );

        const genreMap = await this.genreMapService.resolve();
        const genres = countGenres(credits, genreMap);
        const departments = summarizeDepartments(credits);

        let biography = (data.biography ?? '').trim() || null;
        let biographyLanguage: 'pt' | 'en' | null = biography ? 'pt' : null;

        if (!biography) {
          biography = await this.fetchEnglishBiography(id);
          biographyLanguage = biography ? 'en' : null;
        }

        return {
          credits,
          profile: {
            id: data.id,
            name: data.name,
            profileUrl: data.profile_path
              ? `${this.profileBaseUrl}${data.profile_path}`
              : null,
            biography,
            biographyLanguage,
            birthday: data.birthday ?? null,
            deathday: data.deathday ?? null,
            placeOfBirth: data.place_of_birth ?? null,
            knownForDepartment: data.known_for_department ?? null,
            departments,
            genres,
            stats: buildStats(credits, genres),
            highlights: pickHighlights(credits),
            defaultDepartment: pickDefaultDepartment(
              departments,
              data.known_for_department ?? null,
            ),
          },
        };
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new HttpException('Pessoa não encontrada', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Erro ao buscar dados da pessoa: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProfile(id: number): Promise<PersonProfile> {
    const aggregate = await this.loadAggregate(id);

    return {
      ...aggregate.profile,
      credits: queryCredits(aggregate.credits, {
        department: aggregate.profile.defaultDepartment,
      }),
    };
  }

  async getCredits(
    id: number,
    query: CreditQuery,
  ): Promise<PersonCreditsPage> {
    const aggregate = await this.loadAggregate(id);

    return queryCredits(aggregate.credits, {
      ...query,
      department: query.department || aggregate.profile.defaultDepartment,
    });
  }

  async search(term: string): Promise<PersonSearchResult[]> {
    const trimmed = term?.trim();
    if (!trimmed) return [];

    return this.searchCache.resolve(trimmed.toLowerCase(), async () => {
      const response = await axios.get<any>(
        `${this.baseUrl}/search/person?api_key=${this.apiKey}` +
          `&language=pt-BR&query=${encodeURIComponent(trimmed)}`,
        { timeout: 8000 },
      );

      return (response.data?.results ?? [])
        .filter((result: any) => !result.adult)
        .slice(0, 20)
        .map((result: any) => ({
          id: result.id,
          name: result.name,
          profileUrl: result.profile_path
            ? `${this.profileBaseUrl}${result.profile_path}`
            : null,
          knownForDepartment: result.known_for_department ?? null,
          knownFor: (result.known_for ?? [])
            .map((item: any) => item.title || item.name)
            .filter(Boolean)
            .slice(0, 3),
        }));
    });
  }
}
