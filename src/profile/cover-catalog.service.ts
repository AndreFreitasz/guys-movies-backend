import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';
import { MovieService } from '../movie/movie.service';
import { SerieService } from '../serie/serie.service';
import { CoverOptionDto } from './dto/profile.dto';

const BACKFILL_LIMIT = 24;

@Injectable()
export class CoverCatalogService {
  constructor(
    @InjectRepository(WatchedMovie)
    private readonly watchedMovieRepository: Repository<WatchedMovie>,
    @InjectRepository(WatchedSerie)
    private readonly watchedSerieRepository: Repository<WatchedSerie>,
    @InjectRepository(Movies)
    private readonly movieRepository: Repository<Movies>,
    @InjectRepository(Series)
    private readonly serieRepository: Repository<Series>,
    private readonly movieService: MovieService,
    private readonly serieService: SerieService,
  ) {}

  private matches(title: string, term?: string): boolean {
    if (!term || !term.trim()) return true;
    return title.toLowerCase().includes(term.trim().toLowerCase());
  }

  private async fetchBackdrop(
    option: CoverOptionDto,
  ): Promise<string | null> {
    const detail =
      option.type === 'movie'
        ? await this.movieService.getMovieData(option.idTmdb)
        : await this.serieService.getSerieData(option.idTmdb);

    return detail?.wallpaper_path ?? null;
  }

  private async persistBackdrop(
    option: CoverOptionDto,
    backdropPath: string,
  ): Promise<void> {
    if (option.type === 'movie') {
      await this.movieRepository.update(
        { idTmdb: option.idTmdb },
        { backdropPath },
      );
      return;
    }

    await this.serieRepository.update(
      { idTmdb: option.idTmdb },
      { backdropPath },
    );
  }

  private async backfill(
    options: CoverOptionDto[],
    budget: { left: number },
  ): Promise<CoverOptionDto[]> {
    const resolved = await Promise.all(
      options.map(async option => {
        if (option.backdropPath) return option;
        if (budget.left <= 0) return null;
        budget.left -= 1;

        try {
          const backdropPath = await this.fetchBackdrop(option);
          if (!backdropPath) return null;

          await this.persistBackdrop(option, backdropPath);

          return { ...option, backdropPath };
        } catch {
          return null;
        }
      }),
    );

    return resolved.filter((option): option is CoverOptionDto =>
      Boolean(option),
    );
  }

  async list(userId: number, term?: string): Promise<CoverOptionDto[]> {
    const [watchedMovies, watchedSeries] = await Promise.all([
      this.watchedMovieRepository.find({
        where: { idUser: { id: userId } },
        select: { idTmdb: true },
      }),
      this.watchedSerieRepository.find({
        where: { user: { id: userId } },
        select: { idTmdb: true },
      }),
    ]);

    const movieIds = Array.from(new Set(watchedMovies.map(row => row.idTmdb)));
    const serieIds = Array.from(new Set(watchedSeries.map(row => row.idTmdb)));

    const [movies, series] = await Promise.all([
      movieIds.length
        ? this.movieRepository.find({ where: { idTmdb: In(movieIds) } })
        : Promise.resolve([]),
      serieIds.length
        ? this.serieRepository.find({ where: { idTmdb: In(serieIds) } })
        : Promise.resolve([]),
    ]);

    const candidates: CoverOptionDto[] = [
      ...movies.map(movie => ({
        type: 'movie' as const,
        idTmdb: movie.idTmdb,
        title: movie.title,
        backdropPath: movie.backdropPath ?? null,
      })),
      ...series.map(serie => ({
        type: 'serie' as const,
        idTmdb: serie.idTmdb,
        title: serie.name,
        backdropPath: serie.backdropPath ?? null,
      })),
    ].filter(option => this.matches(option.title, term));

    const options = await this.backfill(candidates, { left: BACKFILL_LIMIT });

    return options.sort((first, second) =>
      first.title.localeCompare(second.title, 'pt-BR'),
    );
  }
}
