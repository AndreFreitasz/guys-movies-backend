import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WatchedSerie } from '../entities/watched-serie.entity';
import { WatchedSeason } from '../entities/watched-season.entity';
import { Repository } from 'typeorm';
import { CreatedSerieDto } from '../dto/created-serie.dto';
import { User } from 'src/users/entities/user.entity';
import { Series } from '../entities/series.entity';
import { CreatedSerieService } from '../created-serie/created-serie.service';
import { SerieService } from '../serie.service';
import { WatchedSeasonService } from './watched-season.service';
import {
  WatchedSerieListDto,
  WatchedSerieListItemDto,
} from '../dto/watched-serie-list.dto';
import {
  WatchSourceDto,
  WatchSourceValue,
} from '../../movie/dto/watch-source.dto';

const AVAILABILITY_CONCURRENCY = 6;

@Injectable()
export class WatchedSerieService {
  private readonly logger = new Logger(WatchedSerieService.name);

  constructor(
    @InjectRepository(WatchedSerie)
    private readonly watchedSerieRepository: Repository<WatchedSerie>,
    @InjectRepository(WatchedSeason)
    private readonly watchedSeasonRepository: Repository<WatchedSeason>,
    @InjectRepository(Series)
    private readonly serieRepository: Repository<Series>,
    private readonly createdSerieService: CreatedSerieService,
    private readonly serieService: SerieService,
    private readonly watchedSeasonService: WatchedSeasonService,
  ) {}

  private assertWatchSource(dto: {
    watchSource?: WatchSourceValue;
    providerId?: number;
  }): void {
    if (dto.watchSource === 'streaming' && dto.providerId == null) {
      throw new BadRequestException(
        'providerId e obrigatorio quando watchSource e streaming',
      );
    }

    if (dto.watchSource !== 'streaming' && dto.providerId != null) {
      throw new BadRequestException(
        'providerId so e aceito quando watchSource e streaming',
      );
    }
  }

  private async assertValidProvider(
    idTmdb: number,
    providerId: number,
  ): Promise<void> {
    let serieData: Awaited<ReturnType<SerieService['getSerieData']>>;

    try {
      serieData = await this.serieService.getSerieData(idTmdb);
    } catch (error) {
      this.logger.warn(
        `Falha ao validar o providerId declarado para a serie ${idTmdb}, aceitando sem confirmar contra a TMDB: ${error}`,
      );
      return;
    }

    const flatrate = serieData?.providers?.flatrate ?? [];
    const isKnownProvider = flatrate.some(
      provider => provider.id_provider === providerId,
    );

    if (!isKnownProvider) {
      throw new BadRequestException(
        'providerId informado nao esta entre os streamings disponiveis para esta serie',
      );
    }
  }

  async markAsWatched(
    watchedAt: Date,
    userId: number,
    createdSerieDto: CreatedSerieDto,
  ): Promise<string> {
    await this.createdSerieService.createSerie(createdSerieDto);
    const serie = await this.createdSerieService.findSerieByIdTmdb(
      createdSerieDto.idTmdb,
    );

    if (!serie) {
      throw new HttpException(
        'Série não encontrada para cadastro',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const existingWatchedSerie = await this.watchedSerieRepository.findOne({
        where: {
          user: { id: userId },
          serie: { id: serie.id },
        },
      });
      if (existingWatchedSerie) {
        await this.destroyWatchedSerie(userId, serie.id);
        return 'Série desmarcada com sucesso';
      }

      this.assertWatchSource(createdSerieDto);

      if (createdSerieDto.watchSource === 'streaming') {
        await this.assertValidProvider(
          createdSerieDto.idTmdb,
          createdSerieDto.providerId,
        );
      }

      const watchedSerie = this.watchedSerieRepository.create({
        user: { id: userId } as User,
        serie: { id: serie.id } as Series,
        watchedAt: watchedAt ? new Date(watchedAt) : undefined,
        idTmdb: createdSerieDto.idTmdb,
        watchSource: createdSerieDto.watchSource ?? null,
        providerId: createdSerieDto.providerId ?? null,
      });
      await this.watchedSerieRepository.insert(watchedSerie);
      return 'Série marcada como assistida com sucesso';
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Erro ao marcar a série como assistida: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async destroyWatchedSerie(userId: number, serieId: number): Promise<string> {
    try {
      const result = await this.watchedSerieRepository.delete({
        user: { id: userId },
        serie: { id: serieId },
      });
      if (result.affected === 0) {
        throw new HttpException(
          'Registro não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      return 'Série desmarcada com sucesso';
    } catch (error) {
      throw new HttpException(
        `Erro ao desmarcar a série: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async matchesProviders(
    watched: WatchedSerie,
    providerIds: number[],
    failures: { value: boolean },
  ): Promise<boolean> {
    if (watched.watchSource === 'streaming') {
      return providerIds.includes(watched.providerId);
    }

    if (watched.watchSource != null) {
      return false;
    }

    try {
      const data = await this.serieService.getSerieData(watched.idTmdb);
      const flatrate = data?.providers?.flatrate ?? [];
      return flatrate.some(provider =>
        providerIds.includes(provider.id_provider),
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar disponibilidade da serie ${watched.idTmdb}: ${error}`,
      );
      failures.value = true;
      return false;
    }
  }

  private async runWithConcurrency<T, R>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let cursor = 0;

    const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
      (async () => {
        while (cursor < items.length) {
          const index = cursor++;
          results[index] = await worker(items[index]);
        }
      })(),
    );

    await Promise.all(runners);
    return results;
  }

  private toListItem(watched: WatchedSerie): WatchedSerieListItemDto {
    return {
      idTmdb: watched.idTmdb,
      name: watched.serie?.name ?? null,
      overview: watched.serie?.overview ?? null,
      posterPath: watched.serie?.posterPath ?? null,
      firstAirDate: watched.serie?.firstAirDate ?? null,
      numberOfSeasons: watched.serie?.numberOfSeasons ?? null,
      voteAverage: watched.serie?.voteAverage ?? null,
      rating: watched.rating ?? null,
      watchedAt: watched.watchedAt
        ? new Date(watched.watchedAt).toISOString()
        : null,
      createdAt: new Date(watched.createdAt).toISOString(),
      completedAt: watched.completedAt
        ? new Date(watched.completedAt).toISOString()
        : null,
      watchedSeasons: 0,
      watchedEpisodes: 0,
      episodeRunTime: watched.serie?.episodeRunTime ?? null,
      providerId: watched.providerId ?? null,
      watchSource: watched.watchSource ?? null,
    };
  }

  private async materializeLegacy(
    userId: number,
    watched: WatchedSerie,
  ): Promise<void> {
    try {
      await this.watchedSeasonService.completeSerie(
        userId,
        watched.idTmdb,
        watched.completedAt
          ? new Date(watched.completedAt).toISOString()
          : null,
      );

      const serieData = await this.serieService.getSerieData(watched.idTmdb);
      if (watched.serie && !watched.serie.episodeRunTime) {
        watched.serie.episodeRunTime = serieData.episodeRunTime;
        await this.serieRepository.save(watched.serie);
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao materializar temporadas da série ${watched.idTmdb}: ${error?.message ?? error}`,
      );
      return;
    }
  }

  private buildListItem(
    watched: WatchedSerie,
    seasons: WatchedSeason[],
  ): WatchedSerieListItemDto {
    const own = seasons.filter(season => season.idTmdb === watched.idTmdb);

    return {
      ...this.toListItem(watched),
      watchedSeasons: own.length,
      watchedEpisodes: own.reduce(
        (total, season) => total + (season.episodeCount ?? 0),
        0,
      ),
    };
  }

  async listWatchedSeries(
    userId: number,
    providerIds?: number[],
  ): Promise<WatchedSerieListDto> {
    let watchedSeries = await this.watchedSerieRepository.find({
      where: { user: { id: userId } },
      relations: { serie: true },
      order: { createdAt: 'DESC' },
    });

    let availabilityFailed = false;

    if (providerIds?.length) {
      const failures = { value: false };
      const flags = await this.runWithConcurrency(
        watchedSeries,
        AVAILABILITY_CONCURRENCY,
        item => this.matchesProviders(item, providerIds, failures),
      );
      watchedSeries = watchedSeries.filter((_, index) => flags[index]);
      availabilityFailed = failures.value;
    }

    const seasons = await this.watchedSeasonRepository.find({
      where: { user: { id: userId } },
    });

    const legacy = watchedSeries.filter(watched => {
      if (!watched.completedAt) return false;

      const ownSeasons = seasons.filter(
        season => season.idTmdb === watched.idTmdb,
      );
      if (ownSeasons.length === 0) return true;

      const totalSeasons = watched.serie?.numberOfSeasons ?? 0;
      return totalSeasons > 0 && ownSeasons.length < totalSeasons;
    });

    for (const watched of legacy) {
      await this.materializeLegacy(userId, watched);
    }

    const currentSeasons = legacy.length
      ? await this.watchedSeasonRepository.find({
          where: { user: { id: userId } },
        })
      : seasons;

    const items = watchedSeries.map(watched =>
      this.buildListItem(watched, currentSeasons),
    );

    const rated = items.filter(item => item.rating !== null);

    return {
      items,
      stats: {
        total: items.length,
        completed: items.filter(item => item.completedAt).length,
        inProgress: items.filter(
          item => !item.completedAt && item.watchedSeasons > 0,
        ).length,
        seasons: items.reduce((total, item) => total + item.watchedSeasons, 0),
        episodes: items.reduce(
          (total, item) => total + item.watchedEpisodes,
          0,
        ),
        runtimeMinutes: items.reduce(
          (total, item) =>
            total + item.watchedEpisodes * (item.episodeRunTime ?? 0),
          0,
        ),
        averageRating: rated.length
          ? rated.reduce((total, item) => total + item.rating, 0) / rated.length
          : null,
        lastActivityAt: items[0]?.createdAt ?? null,
      },
      availabilityFailed,
    };
  }

  async updateWatchedAt(
    userId: number,
    idTmdb: number,
    watchedAt: string | null,
  ): Promise<WatchedSerieListItemDto> {
    if (watchedAt && new Date(watchedAt).getTime() > Date.now()) {
      throw new HttpException(
        'A data de assistido não pode estar no futuro',
        HttpStatus.BAD_REQUEST,
      );
    }

    const watchedSerie = await this.watchedSerieRepository.findOne({
      where: { user: { id: userId }, idTmdb: idTmdb },
      relations: { serie: true },
    });

    if (!watchedSerie) {
      throw new HttpException(
        'Série assistida não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    watchedSerie.watchedAt = watchedAt ? new Date(watchedAt) : null;
    await this.watchedSerieRepository.save(watchedSerie);

    const seasons = await this.watchedSeasonRepository.find({
      where: { user: { id: userId }, idTmdb },
    });

    return this.buildListItem(watchedSerie, seasons);
  }

  async isWatchedSerie(
    userId: number,
    idTmdb: number,
  ): Promise<{
    watched: boolean;
    watchedAt: string | null;
    completedAt: string | null;
    seasons: {
      seasonNumber: number;
      episodeCount: number;
      watchedAt: string | null;
    }[];
  }> {
    try {
      const watchedSerie = await this.watchedSerieRepository.findOne({
        where: {
          user: { id: userId },
          idTmdb: idTmdb,
        },
      });

      const seasons = await this.watchedSeasonRepository.find({
        where: { user: { id: userId }, idTmdb },
        order: { seasonNumber: 'ASC' },
      });

      return {
        watched: Boolean(watchedSerie),
        watchedAt: watchedSerie?.watchedAt
          ? new Date(watchedSerie.watchedAt).toISOString()
          : null,
        completedAt: watchedSerie?.completedAt
          ? new Date(watchedSerie.completedAt).toISOString()
          : null,
        seasons: seasons.map(season => ({
          seasonNumber: season.seasonNumber,
          episodeCount: season.episodeCount,
          watchedAt: season.watchedAt
            ? new Date(season.watchedAt).toISOString()
            : null,
        })),
      };
    } catch (error) {
      throw new HttpException(
        `Erro ao verificar se a série foi assistida: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async rateSerie(
    userId: number,
    idTmdb: number,
    rating: number,
    createSerieDto?: CreatedSerieDto,
  ): Promise<{ message: string; created: boolean }> {
    try {
      const watchedSerie = await this.watchedSerieRepository.findOne({
        where: {
          user: { id: userId },
          idTmdb: idTmdb,
        },
      });

      if (watchedSerie) {
        watchedSerie.rating = rating;
        await this.watchedSerieRepository.save(watchedSerie);
        return { message: 'Avaliação atualizada com sucesso', created: false };
      }

      if (createSerieDto) {
        await this.createdSerieService.createSerie(createSerieDto);
      }

      const serie = await this.createdSerieService.findSerieByIdTmdb(idTmdb);

      const createdRecord = this.watchedSerieRepository.create({
        user: { id: userId } as User,
        serie: serie ? ({ id: serie.id } as Series) : null,
        idTmdb: idTmdb,
        rating: rating,
        watchedAt: null,
      });
      await this.watchedSerieRepository.insert(createdRecord);

      return {
        message: 'Série marcada como assistida com sucesso',
        created: true,
      };
    } catch (error) {
      throw new HttpException(
        `Erro ao atualizar a avaliação: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async setWatchSource(
    userId: number,
    idTmdb: number,
    dto: WatchSourceDto,
  ): Promise<void> {
    const watched = await this.watchedSerieRepository.findOne({
      where: { user: { id: userId }, idTmdb },
    });

    if (!watched) {
      throw new NotFoundException('Serie assistida nao encontrada');
    }

    this.assertWatchSource(dto);

    if (dto.watchSource === 'streaming') {
      await this.assertValidProvider(idTmdb, dto.providerId);
    }

    watched.watchSource = dto.watchSource ?? null;
    watched.providerId = dto.providerId ?? null;

    await this.watchedSerieRepository.save(watched);
  }

  async getSerieRating(userId: number, idTmdb: number): Promise<number | null> {
    try {
      const ratingSerie = await this.watchedSerieRepository.findOne({
        where: {
          user: { id: userId },
          idTmdb: idTmdb,
        },
        select: ['rating'],
      });
      return ratingSerie ? ratingSerie.rating : null;
    } catch (error) {
      throw new HttpException(
        `Erro ao buscar avaliação da série: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
