import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { CastDto, SerieDto, ProvidersDto } from './dto/serie.dto';

@Injectable()
export class SerieService {
  private readonly sizeImageProvider = 'https://image.tmdb.org/t/p/w92';
  private readonly sizeImageSerie = 'https://image.tmdb.org/t/p/original';
  private readonly sizeImageCast = 'https://image.tmdb.org/t/p/w185';

  async getSerieData(idSerie: number): Promise<SerieDto> {
    try {
      const serie = await this.getSerieById(idSerie);
      if (!serie) throw new HttpException('Série não encontrada', HttpStatus.NOT_FOUND);

      const cast = await this.getSerieCast(idSerie).catch(() => []);
      const providers = await this.getSerieProviders(idSerie).catch(
        () => ({}),
      );

      const dataSerie: SerieDto = {
        id: serie.id,
        name: serie.name,
        overview: serie.overview,
        poster_path: `${this.sizeImageSerie}${serie.poster_path}`,
        wallpaper_path: `${this.sizeImageSerie}${serie.backdrop_path}`,
        vote_average: serie.vote_average,
        first_air_date: serie.first_air_date,
        genres: serie.genres.map((genre: { name: string }) => genre.name),
        adult: serie.adult,
        number_of_seasons: serie.number_of_seasons,
        providers: providers,
        cast: cast,
        created_by: serie.created_by.map((creator: any) => ({
          name: creator.name,
          profile_path: creator.profile_path ? `${this.sizeImageCast}${creator.profile_path}` : null,
        })),
      };

      return dataSerie;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Erro ao buscar dados da série: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSerieById(idSerie: number) {
    const url = `https://api.themoviedb.org/3/tv/${idSerie}?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`;
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new HttpException(
        `Erro ao buscar o id da série: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSerieCast(idSerie: number) {
    const url = `https://api.themoviedb.org/3/tv/${idSerie}/credits?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`;
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
        `Não foi possível encontrar o elenco da série: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSerieProviders(idSerie: number) {
    const url = `https://api.themoviedb.org/3/tv/${idSerie}/watch/providers?api_key=${process.env.TMDB_API_KEY}`;
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
