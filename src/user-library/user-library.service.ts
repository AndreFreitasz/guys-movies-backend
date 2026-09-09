import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WaitingMovies } from '../movie/entities/waiting-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WaitingSeries } from '../serie/entities/waiting-serie.entity';
import { UserLibraryDto } from './dto/user-library.dto';

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
}
