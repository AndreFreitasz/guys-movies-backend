import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Follow } from '../users/entities/follow.entity';
import { FavoriteTitle } from '../users/entities/favorite-title.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';
import { UserStatsDto } from './dto/profile.dto';

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
}
