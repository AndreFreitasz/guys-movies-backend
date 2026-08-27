import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { CastDto, ProvidersDto, SerieDto } from './dto/serie.dto';
import { TtlCache } from '../common/ttl-cache';

const PROVIDER_TYPES = ['flatrate', 'buy', 'rent'] as const;

@Injectable()
export class SerieService {
  private readonly sizeImageProvider = 'https://image.tmdb.org/t/p/w92';
  private readonly sizeImagePoster = 'https://image.tmdb.org/t/p/w500';
  private readonly sizeImageBackdrop = 'https://image.tmdb.org/t/p/w1280';
  private readonly sizeImageCast = 'https://image.tmdb.org/t/p/w185';
  private readonly cache = new TtlCache<SerieDto>(60 * 60 * 1000, 500);

  private buildImageUrl(baseUrl: string, path?: string | null): string | null {
    return path ? `${baseUrl}${path}` : null;
  }

  private mapCast(credits: any): CastDto[] {
    const cast = credits?.cast;
    if (!Array.isArray(cast)) return [];

    return cast.slice(0, 20).map((actor: any) => ({
      name: actor.name,
      character: actor.character,
      profile_path: this.buildImageUrl(this.sizeImageCast, actor.profile_path),
    }));
  }

  private mapProviders(watchProviders: any): ProvidersDto {
    const providersData = watchProviders?.results?.BR;
    if (!providersData) return {};

    const result: ProvidersDto = {};

    PROVIDER_TYPES.forEach(type => {
      if (Array.isArray(providersData[type])) {
        result[type] = providersData[type].map((provider: any) => ({
          provider_name: provider.provider_name,
          logo_path: this.buildImageUrl(
            this.sizeImageProvider,
            provider.logo_path,
          ),
          id_provider: provider.provider_id,
        }));
      }
    });

    return result;
  }

  private async fetchSerie(idSerie: number): Promise<SerieDto> {
    const url =
      `https://api.themoviedb.org/3/tv/${idSerie}` +
      `?api_key=${process.env.TMDB_API_KEY}&language=pt-BR` +
      `&append_to_response=credits,watch/providers`;

    const response = await axios.get(url, { timeout: 8000 });
    const serie = response.data;

    return {
      id: serie.id,
      name: serie.name,
      overview: serie.overview,
      poster_path: this.buildImageUrl(this.sizeImagePoster, serie.poster_path),
      wallpaper_path: this.buildImageUrl(
        this.sizeImageBackdrop,
        serie.backdrop_path,
      ),
      vote_average: serie.vote_average,
      first_air_date: serie.first_air_date,
      genres: Array.isArray(serie.genres)
        ? serie.genres.map((genre: { name: string }) => genre.name)
        : [],
      adult: serie.adult,
      number_of_seasons: serie.number_of_seasons,
      providers: this.mapProviders(serie['watch/providers']),
      cast: this.mapCast(serie.credits),
      created_by: Array.isArray(serie.created_by)
        ? serie.created_by.map((creator: any) => ({
            name: creator.name,
            profile_path: this.buildImageUrl(
              this.sizeImageCast,
              creator.profile_path,
            ),
          }))
        : [],
    };
  }

  async getSerieData(idSerie: number): Promise<SerieDto> {
    const id = Math.trunc(Number(idSerie));
    if (!Number.isFinite(id) || id <= 0) {
      throw new HttpException('Id de série inválido', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.cache.resolve(String(id), () => this.fetchSerie(id));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new HttpException('Série não encontrada', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Erro ao buscar dados da série: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
