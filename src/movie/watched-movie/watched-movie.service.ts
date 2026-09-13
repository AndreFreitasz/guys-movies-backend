import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WatchedMovie } from '../entities/watched-movie.entity';
import { Equal, Repository } from 'typeorm';
import { CreatedMovieDto } from '../dto/created-movie.dto';
import { CreatedMovieService } from '../created-movie/created-movie.service';
import { User } from 'src/users/entities/user.entity';
import { Movies } from '../entities/movies.entity';
import {
  WatchedMovieListDto,
  WatchedMovieListItemDto,
} from '../dto/watched-movie-list.dto';
import { WatchSourceDto, WatchSourceValue } from '../dto/watch-source.dto';
import { MovieService } from '../movie.service';
import { runWithConcurrency } from '../../common/run-with-concurrency';

const WATCHED_LIST_LIMIT = 500;
const AVAILABILITY_CONCURRENCY = 6;

@Injectable()
export class WatchedMovieService {
  private readonly logger = new Logger(WatchedMovieService.name);

  constructor(
    @InjectRepository(WatchedMovie)
    private readonly watchedMovieRepository: Repository<WatchedMovie>,
    private readonly createdMovieService: CreatedMovieService,
    private readonly movieService: MovieService,
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
    let movieData: Awaited<ReturnType<MovieService['getMovieData']>>;

    try {
      movieData = await this.movieService.getMovieData(idTmdb);
    } catch (error) {
      this.logger.warn(
        `Falha ao validar o providerId declarado para o filme ${idTmdb}, aceitando sem confirmar contra a TMDB: ${error}`,
      );
      return;
    }

    const flatrate = movieData?.providers?.flatrate ?? [];
    const isKnownProvider = flatrate.some(
      provider => provider.id_provider === providerId,
    );

    if (!isKnownProvider) {
      throw new BadRequestException(
        'providerId informado nao esta entre os streamings disponiveis para este filme',
      );
    }
  }

  async markAsWatched(
    watchedAt: Date,
    userId: number,
    createMovieDto: CreatedMovieDto,
  ): Promise<string> {
    await this.createdMovieService.createMovie(createMovieDto);
    const movie = await this.createdMovieService.findMovieByIdTmdb(
      createMovieDto.idTmdb,
    );

    try {
      const existingWatchedMovie = await this.watchedMovieRepository.findOne({
        where: {
          idUser: { id: userId },
          idMovie: { id: movie.id },
        },
      });

      if (existingWatchedMovie) {
        await this.destroyWatchedMovie(userId, movie.id);
        return 'Filme desmarcado com sucesso';
      }

      this.assertWatchSource(createMovieDto);

      if (createMovieDto.watchSource === 'streaming') {
        await this.assertValidProvider(
          createMovieDto.idTmdb,
          createMovieDto.providerId,
        );
      }

      const watchedMovie = this.watchedMovieRepository.create({
        idUser: { id: userId } as User,
        idMovie: { id: movie.id } as Movies,
        watchedAt: watchedAt ? new Date(watchedAt) : undefined,
        idTmdb: createMovieDto.idTmdb,
        watchSource: createMovieDto.watchSource ?? null,
        providerId: createMovieDto.providerId ?? null,
      });
      await this.watchedMovieRepository.insert(watchedMovie);
      return 'Filme marcado como assistido com sucesso';
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Erro ao marcar o filme como assistido: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async setWatchSource(
    userId: number,
    idTmdb: number,
    dto: WatchSourceDto,
  ): Promise<void> {
    const watched = await this.watchedMovieRepository.findOne({
      where: { idUser: { id: userId }, idTmdb },
    });

    if (!watched) {
      throw new NotFoundException('Filme assistido nao encontrado');
    }

    this.assertWatchSource(dto);

    if (dto.watchSource === 'streaming') {
      await this.assertValidProvider(idTmdb, dto.providerId);
    }

    watched.watchSource = dto.watchSource ?? null;
    watched.providerId = dto.providerId ?? null;

    await this.watchedMovieRepository.save(watched);
  }

  private async matchesProviders(
    watched: WatchedMovie,
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
      const data = await this.movieService.getMovieData(watched.idTmdb);
      const flatrate = data?.providers?.flatrate ?? [];
      return flatrate.some(provider =>
        providerIds.includes(provider.id_provider),
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar disponibilidade do filme ${watched.idTmdb}: ${error}`,
      );
      failures.value = true;
      return false;
    }
  }

  private toListItem(watched: WatchedMovie): WatchedMovieListItemDto {
    return {
      idTmdb: watched.idTmdb,
      title: watched.idMovie?.title ?? null,
      overview: watched.idMovie?.overview ?? null,
      posterPath: watched.idMovie?.posterPath ?? null,
      releaseDate: watched.idMovie?.releaseDate ?? null,
      director: watched.idMovie?.director ?? null,
      voteAverage: watched.idMovie?.voteAverage ?? null,
      rating: watched.rating ?? null,
      watchedAt: watched.watchedAt
        ? new Date(watched.watchedAt).toISOString()
        : null,
      createdAt: new Date(watched.createdAt).toISOString(),
      providerId: watched.providerId ?? null,
      watchSource: watched.watchSource ?? null,
    };
  }

  async listWatchedMovies(
    userId: number,
    providerIds?: number[],
  ): Promise<WatchedMovieListDto> {
    try {
      let watchedMovies = await this.watchedMovieRepository.find({
        where: { idUser: { id: userId } },
        relations: { idMovie: true },
        order: { watchedAt: 'DESC', createdAt: 'DESC' },
        take: WATCHED_LIST_LIMIT,
      });

      let availabilityFailed = false;

      if (providerIds?.length) {
        const failures = { value: false };
        const flags = await runWithConcurrency(
          watchedMovies,
          AVAILABILITY_CONCURRENCY,
          item => this.matchesProviders(item, providerIds, failures),
        );
        watchedMovies = watchedMovies.filter((_, index) => flags[index]);
        availabilityFailed = failures.value;
      }

      const items: WatchedMovieListItemDto[] = watchedMovies.map(watched =>
        this.toListItem(watched),
      );

      const ratings = items
        .map(item => item.rating)
        .filter((rating): rating is number => typeof rating === 'number');

      const watchedDates = items
        .map(item => item.watchedAt)
        .filter((date): date is string => Boolean(date))
        .sort();

      return {
        items,
        stats: {
          total: items.length,
          rated: ratings.length,
          averageRating: ratings.length
            ? Number(
                (
                  ratings.reduce((sum, rating) => sum + rating, 0) /
                  ratings.length
                ).toFixed(2),
              )
            : null,
          lastWatchedAt: watchedDates.length
            ? watchedDates[watchedDates.length - 1]
            : null,
        },
        availabilityFailed,
      };
    } catch (error) {
      throw new HttpException(
        `Erro ao listar os filmes assistidos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async destroyWatchedMovie(userId: number, movieId: number): Promise<string> {
    try {
      const result = await this.watchedMovieRepository.delete({
        idUser: { id: userId },
        idMovie: { id: movieId },
      });
      if (result.affected === 0) {
        throw new HttpException(
          'Registro não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      return 'Filme desmarcado com sucesso';
    } catch (error) {
      throw new HttpException(
        `Erro ao desmarcar o filme: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async isWatchedMovie(
    idUser: number,
    idTmdb: number,
  ): Promise<{ watched: boolean; watchedAt: string | null }> {
    try {
      const watchedMovie = await this.watchedMovieRepository.findOne({
        where: {
          idUser: { id: idUser },
          idTmdb: idTmdb,
        },
      });

      return {
        watched: Boolean(watchedMovie),
        watchedAt: watchedMovie?.watchedAt
          ? new Date(watchedMovie.watchedAt).toISOString()
          : null,
      };
    } catch (error) {
      throw new HttpException(
        `Erro ao verificar se o filme foi assistido: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateWatchedAt(
    userId: number,
    idTmdb: number,
    watchedAt: string | null,
  ): Promise<WatchedMovieListItemDto> {
    if (watchedAt && new Date(watchedAt).getTime() > Date.now()) {
      throw new HttpException(
        'A data de assistido não pode estar no futuro',
        HttpStatus.BAD_REQUEST,
      );
    }

    const watchedMovie = await this.watchedMovieRepository.findOne({
      where: { idUser: { id: userId }, idTmdb: idTmdb },
      relations: { idMovie: true },
    });

    if (!watchedMovie) {
      throw new HttpException(
        'Filme assistido não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    watchedMovie.watchedAt = watchedAt ? new Date(watchedAt) : null;
    await this.watchedMovieRepository.save(watchedMovie);

    return this.toListItem(watchedMovie);
  }

  async rateMovie(
    userId: number,
    idTmdb: number,
    rating: number,
    createMovieDto?: CreatedMovieDto,
  ): Promise<{ message: string; created: boolean }> {
    try {
      const watchedMovie = await this.watchedMovieRepository.findOne({
        where: {
          idUser: { id: userId },
          idTmdb: idTmdb,
        },
      });

      if (watchedMovie) {
        watchedMovie.rating = rating;
        await this.watchedMovieRepository.save(watchedMovie);
        return { message: 'Avaliação atualizada com sucesso', created: false };
      }

      if (createMovieDto) {
        await this.createdMovieService.createMovie(createMovieDto);
      }

      const movie = await this.createdMovieService.findMovieByIdTmdb(idTmdb);

      const createdRecord = this.watchedMovieRepository.create({
        idUser: { id: userId } as User,
        idMovie: movie ? ({ id: movie.id } as Movies) : null,
        idTmdb: idTmdb,
        rating: rating,
        watchedAt: null,
      });
      await this.watchedMovieRepository.insert(createdRecord);

      return {
        message: 'Filme marcado como assistido com sucesso',
        created: true,
      };
    } catch (error) {
      throw new HttpException(
        `Erro ao atualizar a avaliação: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMovieRating(userId: number, idTmdb: number): Promise<number | null> {
    try {
      const ratingMovie = await this.watchedMovieRepository.findOne({
        where: {
          idUser: Equal(userId),
          idTmdb: idTmdb,
        },
        select: ['rating'],
      });
      return ratingMovie ? ratingMovie.rating : null;
    } catch (error) {
      throw new HttpException(
        `Erro ao buscar avaliação do filme: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
