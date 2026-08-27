import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { CastDto, MovieDto, ProvidersDto } from './dto/movie.dto';
import { TtlCache } from '../common/ttl-cache';

const PROVIDER_TYPES = ['flatrate', 'buy', 'rent'] as const;

@Injectable()
export class MovieService {
  private readonly sizeImageProvider = 'https://image.tmdb.org/t/p/w92';
  private readonly sizeImagePoster = 'https://image.tmdb.org/t/p/w500';
  private readonly sizeImageBackdrop = 'https://image.tmdb.org/t/p/w1280';
  private readonly sizeImageCast = 'https://image.tmdb.org/t/p/w185';
  private readonly cache = new TtlCache<MovieDto>(60 * 60 * 1000, 500);

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

  private mapDirector(credits: any) {
    const crew = credits?.crew;
    if (!Array.isArray(crew)) return null;

    const director = crew.find((member: any) => member.job === 'Director');
    if (!director) return null;

    return {
      name: director.name,
      profile_path: this.buildImageUrl(
        this.sizeImageCast,
        director.profile_path,
      ),
    };
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

  private async fetchMovie(idMovie: number): Promise<MovieDto> {
    const url =
      `https://api.themoviedb.org/3/movie/${idMovie}` +
      `?api_key=${process.env.TMDB_API_KEY}&language=pt-BR` +
      `&append_to_response=credits,watch/providers`;

    const response = await axios.get(url, { timeout: 8000 });
    const movie = response.data;

    return {
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      poster_path: this.buildImageUrl(this.sizeImagePoster, movie.poster_path),
      wallpaper_path: this.buildImageUrl(
        this.sizeImageBackdrop,
        movie.backdrop_path,
      ),
      vote_average: movie.vote_average,
      release_date: movie.release_date,
      genres: Array.isArray(movie.genres)
        ? movie.genres.map((genre: { name: string }) => genre.name)
        : [],
      adult: movie.adult,
      providers: this.mapProviders(movie['watch/providers']),
      cast: this.mapCast(movie.credits),
      director: this.mapDirector(movie.credits),
    };
  }

  async getMovieData(idMovie: number): Promise<MovieDto> {
    const id = Math.trunc(Number(idMovie));
    if (!Number.isFinite(id) || id <= 0) {
      throw new HttpException('Id de filme inválido', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.cache.resolve(String(id), () => this.fetchMovie(id));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new HttpException('Filme não encontrado', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Erro ao buscar dados do filme: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
