import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WatchedSerie } from '../entities/watched-serie.entity';
import { Repository } from 'typeorm';
import { CreatedSerieDto } from '../dto/created-serie.dto';
import { User } from 'src/users/entities/user.entity';
import { Series } from '../entities/series.entity';
import { CreatedSerieService } from '../created-serie/created-serie.service';
import { WatchedSerieListItemDto } from '../dto/watched-serie-list.dto';

@Injectable()
export class WatchedSerieService {
  constructor(
    @InjectRepository(WatchedSerie)
    private readonly watchedSerieRepository: Repository<WatchedSerie>,
    private readonly createdSerieService: CreatedSerieService,
  ) {}

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
      const watchedSerie = this.watchedSerieRepository.create({
        user: { id: userId } as User,
        serie: { id: serie.id } as Series,
        watchedAt: watchedAt ? new Date(watchedAt) : undefined,
        idTmdb: createdSerieDto.idTmdb,
      });
      await this.watchedSerieRepository.insert(watchedSerie);
      return 'Série marcada como assistida com sucesso';
    } catch (error) {
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

    return this.toListItem(watchedSerie);
  }

  async isWatchedSerie(
    userId: number,
    idTmdb: number,
  ): Promise<{ watched: boolean; watchedAt: string | null }> {
    try {
      const watchedSerie = await this.watchedSerieRepository.findOne({
        where: {
          user: { id: userId },
          idTmdb: idTmdb,
        },
      });

      return {
        watched: Boolean(watchedSerie),
        watchedAt: watchedSerie?.watchedAt
          ? new Date(watchedSerie.watchedAt).toISOString()
          : null,
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
