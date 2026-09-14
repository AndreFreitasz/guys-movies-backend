import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Follow } from '../users/entities/follow.entity';
import { FavoriteTitle } from '../users/entities/favorite-title.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';
import {
  FavoriteDto,
  ProfileCountsDto,
  ProfileDto,
  UserStatsDto,
} from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(FavoriteTitle)
    private readonly favoriteRepository: Repository<FavoriteTitle>,
    @InjectRepository(WatchedMovie)
    private readonly watchedMovieRepository: Repository<WatchedMovie>,
    @InjectRepository(WatchedSerie)
    private readonly watchedSerieRepository: Repository<WatchedSerie>,
    @InjectRepository(WatchedSeason)
    private readonly watchedSeasonRepository: Repository<WatchedSeason>,
    @InjectRepository(Movies)
    private readonly movieRepository: Repository<Movies>,
    @InjectRepository(Series)
    private readonly serieRepository: Repository<Series>,
  ) {}

  async getStats(userId: number): Promise<UserStatsDto> {
    const [movies, series, seasons] = await Promise.all([
      this.watchedMovieRepository.count({ where: { idUser: { id: userId } } }),
      this.watchedSerieRepository.count({ where: { user: { id: userId } } }),
      this.watchedSeasonRepository.find({
        where: { user: { id: userId } },
        select: { idTmdb: true, episodeCount: true },
      }),
    ]);

    const episodes = seasons.reduce(
      (total, season) => total + (season.episodeCount ?? 0),
      0,
    );

    const serieIds = Array.from(new Set(seasons.map(season => season.idTmdb)));
    const serieRows = serieIds.length
      ? await this.serieRepository.find({
          where: { idTmdb: In(serieIds) },
          select: { idTmdb: true, episodeRunTime: true },
        })
      : [];

    const runtimeById = new Map(
      serieRows.map(serie => [serie.idTmdb, serie.episodeRunTime ?? 0]),
    );

    const serieRuntimeMinutes = seasons.reduce(
      (total, season) =>
        total +
        (season.episodeCount ?? 0) * (runtimeById.get(season.idTmdb) ?? 0),
      0,
    );

    return { movies, series, episodes, serieRuntimeMinutes };
  }

  private yearOf(date: string | null | undefined): number | null {
    if (!date) return null;
    const year = Number.parseInt(String(date).slice(0, 4), 10);
    return Number.isInteger(year) ? year : null;
  }

  private async resolveFavorites(userId: number): Promise<FavoriteDto[]> {
    const rows = await this.favoriteRepository.find({
      where: { user: { id: userId } },
      order: { position: 'ASC' },
    });

    if (rows.length === 0) return [];

    const movieIds = rows.filter(r => r.type === 'movie').map(r => r.idTmdb);
    const serieIds = rows.filter(r => r.type === 'serie').map(r => r.idTmdb);

    const [movies, series] = await Promise.all([
      movieIds.length
        ? this.movieRepository.find({ where: { idTmdb: In(movieIds) } })
        : Promise.resolve([]),
      serieIds.length
        ? this.serieRepository.find({ where: { idTmdb: In(serieIds) } })
        : Promise.resolve([]),
    ]);

    const movieById = new Map(movies.map(movie => [movie.idTmdb, movie]));
    const serieById = new Map(series.map(serie => [serie.idTmdb, serie]));

    return rows.reduce<FavoriteDto[]>((accumulator, row) => {
      if (row.type === 'movie') {
        const movie = movieById.get(row.idTmdb);
        if (movie) {
          accumulator.push({
            type: 'movie',
            idTmdb: row.idTmdb,
            title: movie.title,
            posterPath: movie.posterPath ?? null,
            year: this.yearOf(movie.releaseDate),
            position: row.position,
          });
        }
        return accumulator;
      }

      const serie = serieById.get(row.idTmdb);
      if (serie) {
        accumulator.push({
          type: 'serie',
          idTmdb: row.idTmdb,
          title: serie.name,
          posterPath: serie.posterPath ?? null,
          year: this.yearOf(serie.firstAirDate),
          position: row.position,
        });
      }
      return accumulator;
    }, []);
  }

  private async resolveCounts(userId: number): Promise<ProfileCountsDto> {
    const [followers, following, movies, seasons] = await Promise.all([
      this.followRepository.count({ where: { following: { id: userId } } }),
      this.followRepository.count({ where: { follower: { id: userId } } }),
      this.watchedMovieRepository.count({ where: { idUser: { id: userId } } }),
      this.watchedSeasonRepository.find({
        where: { user: { id: userId } },
        select: { idTmdb: true, episodeCount: true },
      }),
    ]);

    return {
      followers,
      following,
      movies,
      episodes: seasons.reduce(
        (total, season) => total + (season.episodeCount ?? 0),
        0,
      ),
    };
  }

  async getProfile(viewerId: number, username: string): Promise<ProfileDto> {
    const owner = await this.userRepository.findOne({
      where: { username: ILike(username) },
      select: ['id', 'username', 'name', 'bio'],
    });

    if (!owner) {
      throw new NotFoundException('Perfil nao encontrado');
    }

    const isSelf = owner.id === viewerId;

    const [counts, favorites, followingRow, followsYouRow] = await Promise.all([
      this.resolveCounts(owner.id),
      this.resolveFavorites(owner.id),
      isSelf
        ? Promise.resolve(null)
        : this.followRepository.findOne({
            where: { follower: { id: viewerId }, following: { id: owner.id } },
            select: ['id'],
          }),
      isSelf
        ? Promise.resolve(null)
        : this.followRepository.findOne({
            where: { follower: { id: owner.id }, following: { id: viewerId } },
            select: ['id'],
          }),
    ]);

    return {
      id: owner.id,
      username: owner.username,
      name: owner.name,
      bio: owner.bio ?? null,
      isSelf,
      isFollowing: Boolean(followingRow),
      followsYou: Boolean(followsYouRow),
      counts,
      favorites,
    };
  }
}
