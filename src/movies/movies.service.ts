import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

@Injectable()
export class MoviesService {
  private readonly apiKey = process.env.TMDB_API_KEY;
  private readonly baseUrl = "https://api.themoviedb.org/3";
  private readonly imageBaseUrl = "https://image.tmdb.org/t/p/w500";

  private async fetchFromApiMovies(url: string): Promise<any> {
    const response = await axios.get(url);
    return await response.data;
  }

  private async getTopMoviesProvider(providerId: number, providerName: string) {
    const url = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=pt-BR&region=BR&with_watch_providers=${providerId}&watch_region=BR&sort_by=popularity.desc`;

    const topMoviesProviders = await this.fetchFromApiMovies(url);
    const moviesWithImages = topMoviesProviders.results.map((movie: any) => ({
      ...movie,
      poster_url: `${this.imageBaseUrl}${movie.poster_path}`,
    }));

    return moviesWithImages;
  }

  async getAllTopMoviesProviders() {
    try {
      const providers = [
        {
          id: 8,
          name: "Netflix",
          logo_path: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
        },
        {
          id: 384,
          name: "HBO Max",
          logo_path: "/fksCUZ9QDWZMUwL2LgMtLckROUN.jpg",
        },
        {
          id: 337,
          name: "Disney+",
          logo_path: "/97yvRBw1GzX7fXprcF80er19ot.jpg",
        },
        {
          id: 119,
          name: "Prime Video",
          logo_path: "/dQeAar5H991VYporEjUspolDarG.jpg",
        },
        {
          id: 531,
          name: "Paramount+",
          logo_path: "/h5DcR0J2EESLitnhR8xLG1QymTE.jpg",
        },
        {
          id: 307,
          name: "Globo Play",
          logo_path: "/7Cg8esVVXOijXAm1f1vrS7jVjcN.jpg",
        },
      ];

      const allMoviesProviders = await Promise.all(
        providers.map((provider) =>
          this.getTopMoviesProvider(provider.id, provider.name).then(
            (movies) => ({
              provider: {
                id: provider.id,
                name: provider.name,
                logo_url: `https://image.tmdb.org/t/p/w92${provider.logo_path}`,
              },
              movies,
            }),
          ),
        ),
      );

      return allMoviesProviders;
    } catch (error) {
      console.error("Error fetching all top movies:", error);
      throw new HttpException(
        "Failed to fetch all top movies",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTopMovies() {
    try {
      const url = `${this.baseUrl}/movie/popular?api_key=${this.apiKey}&language=pt-BR&region=BR`;
      const topMovies = await this.fetchFromApiMovies(url);

      const moviesWithImages = topMovies.results.map((movie: any) => ({
        ...movie,
        poster_url: `${this.imageBaseUrl}${movie.poster_path}`,
      }));

      return moviesWithImages;
    } catch (error) {
      console.error("Error fetching top movies:", error);
      throw new HttpException(
        "Failed to fetch top movies",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
