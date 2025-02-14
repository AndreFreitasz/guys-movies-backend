import { Injectable } from '@nestjs/common';
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
      const cast = await this.getMovieCast(idMovie);
      const director = await this.getMovieDirector(idMovie);
      const providers = await this.getMovieProviders(idMovie);

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
        director: director
      };

      return dataMovie;
    } catch (error) {
      console.log(error);
    }
  }

  async getMovieById(idMovie: number) {
    const url = `https://api.themoviedb.org/3/movie/${idMovie}?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`;
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.log("Não foi possível encontrar o filme: ", error); 
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
      console.log("Não foi possível encontrar o elenco do filme: ", error); 
    }
  }

  async getMovieDirector(idMovie: number) {
    const url = `https://api.themoviedb.org/3/movie/${idMovie}/credits?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`;
    try {
      const response = await axios.get(url);
      const crew = response.data.crew;
      const director = crew.find((member: any) => member.job === 'Director');

      return {
        name: director.name,
        profile_path: `${this.sizeImageCast}${director.profile_path}`,
      };
    } catch (error) {
      console.log("Não foi possível encontrar o diretor do filme: ", error);
    }
  }

  async getMovieProviders(idMovie: number) {
    const url = `https://api.themoviedb.org/3/movie/${idMovie}/watch/providers?api_key=${process.env.TMDB_API_KEY}`;
    try {
      const response = await axios.get(url);
      const providersData = response.data.results.BR;
      const providerTypes = ['flatrate', 'buy', 'rent'];
      const result: ProvidersDto = {}
      
      providerTypes.forEach((type) => {
        if (providersData[type]) {
          result[type] = providersData[type].map((provider: any) => ({
            provider_name: provider.provider_name,
            logo_path: `${this.sizeImageProvider}${provider.logo_path}`,
          }));
        }
      });

      return result;
    } catch (error) {
      console.log("Não foi possível encontrar os streamings: ", error); 
    }
  }
}
