import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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

const WATCHED_LIST_LIMIT = 500;

@Injectable()
export class WatchedMovieService {
  constructor(
    @InjectRepository(WatchedMovie)
    private readonly watchedMovieRepository: Repository<WatchedMovie>,
    private readonly createdMovieService: CreatedMovieService,
  ) {}

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

      const watchedMovie = this.watchedMovieRepository.create({
        idUser: { id: userId } as User,
        idMovie: { id: movie.id } as Movies,
        watchedAt: watchedAt ? new Date(watchedAt) : undefined,
        idTmdb: createMovieDto.idTmdb,
      });
      await this.watchedMovieRepository.insert(watchedMovie);
      return 'Filme marcado como assistido com sucesso';
    } catch (error) {
      throw new HttpException(
        `Erro ao marcar o filme como assistido: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listWatchedMovies(userId: number): Promise<WatchedMovieListDto> {
    try {
      const watchedMovies = await this.watchedMovieRepository.find({
        where: { idUser: { id: userId } },
        relations: { idMovie: true },
        order: { watchedAt: 'DESC', createdAt: 'DESC' },
        take: WATCHED_LIST_LIMIT,
      });

      const items: WatchedMovieListItemDto[] = watchedMovies.map(watched => ({
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
      }));

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

  async isWatchedMovie(idUser: number, idTmdb: number): Promise<boolean> {
    try {
      const watchedMovie = await this.watchedMovieRepository.findOne({
        where: {
          idUser: { id: idUser },
          idTmdb: idTmdb,
        },
      });
      return watchedMovie ? true : false;
    } catch (error) {
      throw new HttpException(
        `Erro ao verificar se o filme foi assistido: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
