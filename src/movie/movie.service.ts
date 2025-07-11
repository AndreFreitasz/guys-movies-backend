import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { CastDto, MovieDto, ProviderDto, ProvidersDto } from './dto/movie.dto';

@Injectable()
export class MovieService {
  private readonly sizeImageProvider = 'https://image.tmdb.org/t/p/w92';
  private readonly sizeImageMovie = 'https://image.tmdb.org/t/p/original';
  private readonly sizeImageCast = 'https://image.tmdb.org/t/p/w185';

  async getMovieData(idMovie: number) {
    try {
      const movie = await this.getMovieById(idMovie);
      if (!movie) throw new HttpException('Filme não encontrado', HttpStatus.NOT_FOUND);

      const cast = await this.getMovieCast(idMovie).catch(() => []);
      const director = await this.getMovieDirector(idMovie).catch(() => null);
      const providers = await this.getMovieProviders(idMovie).catch(
        () => ({}),
      );

      const dataMovie: MovieDto = {
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        poster_path: `${this.sizeImageMovie}${movie.poster_path}`,
        wallpaper_path: `${this.sizeImageMovie}${movie.backdrop_path}`,
        vote_average: movie.vote_average,
        release_date: movie.release_date,
        genres: movie.genres.map((genre: { name: string }) => genre.name),
        adult: movie.adult,
        providers: providers,
        cast: cast,
        director: director,
      };

      return dataMovie;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Erro ao buscar dados do filme: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMovieById(idMovie: number) {
    const url = `https://api.themoviedb.org/3/movie/${idMovie}?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`;
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Erro ao buscar o id do filme: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMovieCast(idMovie: number) {
    const url = `https://api.themoviedb.org/3/movie/${idMovie}/credits?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`;
    try {
      const response = await axios.get(url);
      const cast = response.data.cast;
      const actors: CastDto[] = cast.map((actor: any) => ({
        name: actor.name,
        character: actor.character,
        profile_path: `${this.sizeImageCast}${actor.profile_path}`,
      }));

      return actors;
    } catch (error) {
      throw new HttpException(
        `Não foi possível encontrar o elenco do filme: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMovieDirector(idMovie: number) {
    const url = `https://api.themoviedb.org/3/movie/${idMovie}/credits?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`;
    try {
      const response = await axios.get(url);
      const crew = response.data.crew;
      const director = crew.find((member: any) => member.job === 'Director');

      if (!director) return null;

      return {
        name: director.name,
        profile_path: director.profile_path
          ? `${this.sizeImageCast}${director.profile_path}`
          : null,
      };
    } catch (error) {
      throw new HttpException(
        `Não foi possível encontrar o diretor do filme: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMovieProviders(idMovie: number) {
    const url = `https://api.themoviedb.org/3/movie/${idMovie}/watch/providers?api_key=${process.env.TMDB_API_KEY}`;
    try {
      const response = await axios.get(url);
      const providersData = response.data.results.BR;

      if (!providersData) return {};

      const providerTypes = ['flatrate', 'buy', 'rent'];
      const result: ProvidersDto = {};

      providerTypes.forEach((type) => {
        if (providersData[type]) {
          result[type] = providersData[type].map((provider: any) => ({
            provider_name: provider.provider_name,
            logo_path: `${this.sizeImageProvider}${provider.logo_path}`,
            id_provider: provider.provider_id,
          }));
        }
      });

      return result;
    } catch (error) {
      throw new HttpException(
        `Não foi possível encontrar os streamings: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
