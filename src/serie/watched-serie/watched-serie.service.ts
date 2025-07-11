import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WatchedSerie } from '../entities/watched-serie.entity';
import { Equal, Repository } from 'typeorm';
import { SerieDto } from '../dto/serie.dto';
import { User } from 'src/users/entities/user.entity';
import { Series } from '../entities/series.entity';
import { CreatedSerieService } from '../created-serie/created-serie.service';

@Injectable()
export class WatchedSerieService {
  constructor(
    @InjectRepository(WatchedSerie)
    private readonly watchedSerieRepository: Repository<WatchedSerie>,
    private readonly createdSerieService: CreatedSerieService,
  ) {}

  async markAsWatched(watchedAt: Date, userId: number, serieDto: SerieDto): Promise<string> {
    const createdSerieDto = {
      name: serieDto.name,
      overview: serieDto.overview,
      firstAirDate: serieDto.first_air_date,
      idTmdb: serieDto.id,
      posterPath: serieDto.poster_path,
      numberOfSeasons: serieDto.number_of_seasons,
      voteAverage: serieDto.vote_average,
    };
    // Garante que a série está cadastrada na base
    await this.createdSerieService.createSerie(createdSerieDto);
    const serie = await this.createdSerieService.findSerieByIdTmdb(
      createdSerieDto.idTmdb,
    );

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
        idTmdb: serie.idTmdb,
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

  async isWatchedSerie(userId: number, idTmdb: number): Promise<boolean> {
    try {
      const watchedSerie = await this.watchedSerieRepository.findOne({
        where: {
          user: { id: userId },
          idTmdb: idTmdb,
        },
      });
      return watchedSerie ? true : false;
    } catch (error) {
      throw new HttpException(
        `Erro ao verificar se a série foi assistida: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async rateSerie(userId: number, idTmdb: number, rating: number): Promise<string> {
    try {
      let watchedSerie = await this.watchedSerieRepository.findOne({
        where: {
          user: { id: userId },
          idTmdb: idTmdb,
        },
      });
      if (watchedSerie) {
        watchedSerie.rating = rating;
        await this.watchedSerieRepository.save(watchedSerie);
        return 'Avaliação atualizada com sucesso';
      }
      watchedSerie = this.watchedSerieRepository.create({
        user: { id: userId } as User,
        idTmdb: idTmdb,
        rating: rating,
        watchedAt: null,
      });
      await this.watchedSerieRepository.insert(watchedSerie);
      return 'Série marcada como assistida com sucesso';
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
