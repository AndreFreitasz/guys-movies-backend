import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WatchedMovie } from '../entities/watched-movie.entity';
import { Repository } from 'typeorm';
import { CreatedMovieDto } from '../dto/created-movie.dto';
import { CreatedMovieService } from '../created-movie/created-movie.service';
import { User } from 'src/users/entities/user.entity';
import { Movies } from '../entities/movies.entity';

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
        watchedAt: watchedAt,
      });
      await this.watchedMovieRepository.save(watchedMovie);
      return 'Filme marcado como assistido com sucesso';
    } catch {
      throw new HttpException(
        'Erro ao marcar o filme como assistido',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async destroyWatchedMovie(userId: number, idMovie: number): Promise<string> {
    try {
      const result = await this.watchedMovieRepository.delete({
        idUser: { id: userId },
        idMovie: { id: idMovie },
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
        'Erro ao desmarcar o filme',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
