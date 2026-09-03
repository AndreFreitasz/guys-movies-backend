import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchedSeason } from '../entities/watched-season.entity';
import { WatchedSerie } from '../entities/watched-serie.entity';
import { Series } from '../entities/series.entity';
import { SerieService } from '../serie.service';
import { CreatedSerieService } from '../created-serie/created-serie.service';
import { CreatedSerieDto } from '../dto/created-serie.dto';
import { SerieDto } from '../dto/serie.dto';
import { SeasonProgressDto } from '../dto/watched-serie-list.dto';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class WatchedSeasonService {
  constructor(
    @InjectRepository(WatchedSeason)
    private readonly watchedSeasonRepository: Repository<WatchedSeason>,
    @InjectRepository(WatchedSerie)
    private readonly watchedSerieRepository: Repository<WatchedSerie>,
    @InjectRepository(Series)
    private readonly serieRepository: Repository<Series>,
    private readonly serieService: SerieService,
    private readonly createdSerieService: CreatedSerieService,
  ) {}

  private async resolveSeason(idTmdb: number, seasonNumber: number) {
    if (seasonNumber < 1) {
      throw new HttpException('Temporada inválida', HttpStatus.BAD_REQUEST);
    }

    const serie = await this.serieService.getSerieData(idTmdb);
    const season = serie.seasons?.find(
      entry => entry.season_number === seasonNumber,
    );

    if (!season) {
      throw new HttpException(
        'Temporada não encontrada na série',
        HttpStatus.NOT_FOUND,
      );
    }

    return { serie, season };
  }

  private async syncSerieCatalog(
    idTmdb: number,
    serieData: SerieDto,
  ): Promise<Series | null> {
    const serie = await this.createdSerieService.findSerieByIdTmdb(idTmdb);
    if (!serie) return null;

    serie.numberOfSeasons = serieData.number_of_seasons;
    if (serieData.episodeRunTime != null) {
      serie.episodeRunTime = serieData.episodeRunTime;
    }

    return this.serieRepository.save(serie);
  }

  private async ensureWatchedSerie(
    userId: number,
    idTmdb: number,
    serie: Series | null,
  ): Promise<WatchedSerie> {
    const existing = await this.watchedSerieRepository.findOne({
      where: { user: { id: userId }, idTmdb },
    });

    if (existing) return existing;

    const created = this.watchedSerieRepository.create({
      user: { id: userId } as any,
      serie,
      idTmdb,
      watchedAt: null,
    });

    return this.watchedSerieRepository.save(created);
  }

  async markSeason(
    userId: number,
    idTmdb: number,
    seasonNumber: number,
    watchedAt: string | null,
    createSerieDto?: CreatedSerieDto,
  ): Promise<SeasonProgressDto> {
    if (watchedAt && new Date(watchedAt).getTime() > Date.now()) {
      throw new HttpException(
        'A data de assistido não pode estar no futuro',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { serie: serieData, season } = await this.resolveSeason(
      idTmdb,
      seasonNumber,
    );

    if (createSerieDto) {
      await this.createdSerieService.createSerie(createSerieDto);
    }

    const serie = await this.syncSerieCatalog(idTmdb, serieData);

    await this.ensureWatchedSerie(userId, idTmdb, serie);

    try {
      const existing = await this.watchedSeasonRepository.findOne({
        where: { user: { id: userId }, idTmdb, seasonNumber },
      });

      if (existing) {
        existing.episodeCount = season.episode_count;
        if (watchedAt) existing.watchedAt = new Date(watchedAt);
        await this.watchedSeasonRepository.save(existing);
      } else {
        const created = this.watchedSeasonRepository.create({
          user: { id: userId } as any,
          serie,
          idTmdb,
          seasonNumber,
          episodeCount: season.episode_count,
          watchedAt: watchedAt ? new Date(watchedAt) : null,
        });
        await this.watchedSeasonRepository.save(created);
      }
    } catch (error) {
      if (error?.code !== UNIQUE_VIOLATION) throw error;
    }

    return this.syncCompletion(userId, idTmdb);
  }

  async unmarkSeason(
    userId: number,
    idTmdb: number,
    seasonNumber: number,
  ): Promise<SeasonProgressDto> {
    const result = await this.watchedSeasonRepository.delete({
      user: { id: userId },
      idTmdb,
      seasonNumber,
    });

    if (!result.affected) {
      throw new HttpException(
        'Temporada assistida não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.syncCompletion(userId, idTmdb, true);
  }

  async syncCompletion(
    userId: number,
    idTmdb: number,
    clearWhenIncomplete = false,
  ): Promise<SeasonProgressDto> {
    const seasons = await this.watchedSeasonRepository.find({
      where: { user: { id: userId }, idTmdb },
    });

    const watchedSeasons = seasons.length;
    const watchedEpisodes = seasons.reduce(
      (total, season) => total + (season.episodeCount ?? 0),
      0,
    );

    const watchedSerie = await this.watchedSerieRepository.findOne({
      where: { user: { id: userId }, idTmdb },
      relations: { serie: true },
    });

    if (!watchedSerie) {
      return { watchedSeasons, watchedEpisodes, completedAt: null };
    }

    const totalSeasons = watchedSerie.serie?.numberOfSeasons ?? 0;

    if (
      clearWhenIncomplete &&
      watchedSerie.completedAt &&
      totalSeasons > 0 &&
      watchedSeasons < totalSeasons
    ) {
      watchedSerie.completedAt = null;
      await this.watchedSerieRepository.save(watchedSerie);
    }

    if (
      !watchedSerie.completedAt &&
      totalSeasons > 0 &&
      watchedSeasons >= totalSeasons
    ) {
      watchedSerie.completedAt = new Date();
      await this.watchedSerieRepository.save(watchedSerie);
    }

    return {
      watchedSeasons,
      watchedEpisodes,
      completedAt: watchedSerie.completedAt
        ? new Date(watchedSerie.completedAt).toISOString()
        : null,
    };
  }

  async completeSerie(
    userId: number,
    idTmdb: number,
    completedAt: string | null,
    createSerieDto?: CreatedSerieDto,
  ): Promise<SeasonProgressDto> {
    if (completedAt && new Date(completedAt).getTime() > Date.now()) {
      throw new HttpException(
        'A data de conclusão não pode estar no futuro',
        HttpStatus.BAD_REQUEST,
      );
    }

    const serieData = await this.serieService.getSerieData(idTmdb);

    if (createSerieDto) {
      await this.createdSerieService.createSerie(createSerieDto);
    }

    const serie = await this.syncSerieCatalog(idTmdb, serieData);

    await this.ensureWatchedSerie(userId, idTmdb, serie);

    const existingSeasons = await this.watchedSeasonRepository.find({
      where: { user: { id: userId }, idTmdb },
    });
    const watchedSeasonNumbers = new Set(
      existingSeasons.map(season => season.seasonNumber),
    );

    for (const season of serieData.seasons ?? []) {
      if (watchedSeasonNumbers.has(season.season_number)) continue;

      const created = this.watchedSeasonRepository.create({
        user: { id: userId } as any,
        serie,
        idTmdb,
        seasonNumber: season.season_number,
        episodeCount: season.episode_count,
        watchedAt: null,
      });
      await this.watchedSeasonRepository.save(created);
    }

    const watchedSerie = await this.watchedSerieRepository.findOne({
      where: { user: { id: userId }, idTmdb },
      relations: { serie: true },
    });

    if (watchedSerie) {
      watchedSerie.completedAt = completedAt
        ? new Date(completedAt)
        : new Date();
      await this.watchedSerieRepository.save(watchedSerie);
    }

    return this.syncCompletion(userId, idTmdb);
  }
}
