import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WaitingMovies } from '../movie/entities/waiting-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WaitingSeries } from '../serie/entities/waiting-serie.entity';
import { UserLibraryDto } from './dto/user-library.dto';
import { WatchlistDto, WatchlistItemDto } from './dto/watchlist.dto';

const WATCHLIST_LIMIT = 500;

@Injectable()
export class UserLibraryService {
  constructor(
    @InjectRepository(WatchedMovie)
    private readonly watchedMovieRepository: Repository<WatchedMovie>,
    @InjectRepository(WaitingMovies)
    private readonly waitingMovieRepository: Repository<WaitingMovies>,
    @InjectRepository(WatchedSerie)
    private readonly watchedSerieRepository: Repository<WatchedSerie>,
    @InjectRepository(WaitingSeries)
    private readonly waitingSerieRepository: Repository<WaitingSeries>,
  ) {}

  async getLibrary(userId: number): Promise<UserLibraryDto> {
    const [watchedMovies, watchlistMovies, watchedSeries, watchlistSeries] =
      await Promise.all([
        this.watchedMovieRepository.find({
          where: { idUser: { id: userId } },
          select: { idTmdb: true },
        }),
        this.waitingMovieRepository.find({
          where: { user: { id: userId } },
          select: { idTmdb: true },
        }),
        this.watchedSerieRepository.find({
          where: { user: { id: userId } },
          select: { idTmdb: true },
        }),
        this.waitingSerieRepository.find({
          where: { user: { id: userId } },
          select: { idTmdb: true },
        }),
      ]);

    const ids = (rows: { idTmdb: number | null }[]): number[] =>
      rows
        .map(row => row.idTmdb)
        .filter((value): value is number => value != null);

    return {
      watchedMovies: ids(watchedMovies),
      watchedSeries: ids(watchedSeries),
      watchlistMovies: ids(watchlistMovies),
      watchlistSeries: ids(watchlistSeries),
    };
  }

  async getWatchlist(userId: number): Promise<WatchlistDto> {
    const [waitingMovies, waitingSeries, watchedMovies, watchedSeries] =
      await Promise.all([
        this.waitingMovieRepository.find({
          where: { user: { id: userId } },
          relations: { movie: true },
          order: { createdAt: 'DESC' },
          take: WATCHLIST_LIMIT,
        }),
        this.waitingSerieRepository.find({
          where: { user: { id: userId } },
          relations: { serie: true },
          order: { createdAt: 'DESC' },
          take: WATCHLIST_LIMIT,
        }),
        this.watchedMovieRepository.find({
          where: { idUser: { id: userId } },
          select: { idTmdb: true },
        }),
        this.watchedSerieRepository.find({
          where: { user: { id: userId } },
          select: { idTmdb: true },
        }),
      ]);

    const watchedMovieIds = new Set(
      watchedMovies.map(row => row.idTmdb).filter(id => id != null),
    );
    const watchedSerieIds = new Set(
      watchedSeries.map(row => row.idTmdb).filter(id => id != null),
    );

    const movieItems = waitingMovies
      .filter(row => row.idTmdb != null && row.movie != null)
      .map(row => ({
        type: 'movie' as const,
        idTmdb: row.idTmdb,
        title: row.movie.title,
        posterPath: row.movie.posterPath ?? null,
        releaseDate: row.movie.releaseDate ?? null,
        voteAverage: row.movie.voteAverage ?? null,
        addedAt: new Date(row.createdAt).toISOString(),
        watched: watchedMovieIds.has(row.idTmdb),
      }));

    const serieItems = waitingSeries
      .filter(row => row.idTmdb != null && row.serie != null)
      .map(row => ({
        type: 'serie' as const,
        idTmdb: row.idTmdb,
        title: row.serie.name,
        posterPath: row.serie.posterPath ?? null,
        releaseDate: row.serie.firstAirDate ?? null,
        voteAverage: row.serie.voteAverage ?? null,
        addedAt: new Date(row.createdAt).toISOString(),
        watched: watchedSerieIds.has(row.idTmdb),
      }));

    const items: WatchlistItemDto[] = [...movieItems, ...serieItems]
      .sort((first, second) => second.addedAt.localeCompare(first.addedAt))
      .slice(0, WATCHLIST_LIMIT);

    return {
      items,
      stats: {
        total: items.length,
        movies: items.filter(item => item.type === 'movie').length,
        series: items.filter(item => item.type === 'serie').length,
      },
    };
  }
}
