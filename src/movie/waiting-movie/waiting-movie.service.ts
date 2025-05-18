import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CreatedMovieDto } from "../dto/created-movie.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { WaitingMovies } from "../entities/waiting-movie.entity";
import { Repository } from "typeorm";
import { CreatedMovieService } from "../created-movie/created-movie.service";
import { User } from "src/users/entities/user.entity";
import { Movies } from "../entities/movies.entity";

@Injectable()
export class WaitingMovieService {
  constructor(
    @InjectRepository(WaitingMovies)
    private readonly waitingMovieRepository: Repository<WaitingMovies>,
    private readonly createdMovieService: CreatedMovieService,
  ) {}

  async markAsWaiting(userId: number, createMovieDto: CreatedMovieDto): Promise<string> {
    await this.createdMovieService.createMovie(createMovieDto);
    const movie = await this.createdMovieService.findMovieByIdTmdb(
      createMovieDto.idTmdb,
    );

    try {
      const existingWaitingMovie = await this.waitingMovieRepository.findOne({
        where: {
          user: { id: userId },
          movie: { id: movie.id },
        },
      });

      if (existingWaitingMovie) {
        await this.destroyWaitingMovie(userId, movie.id);
        return 'Filme retirado da lista de espera';
      }
   
      const waitingMovie = this.waitingMovieRepository.create({
        user: { id: userId } as User,
        movie: { id: movie.id } as Movies,     
        idTmdb: createMovieDto.idTmdb,     
      });
      await this.waitingMovieRepository.save(waitingMovie);
      return 'Filme adicionado na lista de espera';
    } catch (error){
      throw new HttpException(
        `Erro ao atualiza o filme da sua lista de espera: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async destroyWaitingMovie(userId: number, movieId: number): Promise<string> {
    try {
      const result = await this.waitingMovieRepository.delete({
        user: { id: userId },
        movie: { id: movieId },
      });
      if (result.affected === 0) {
        throw new HttpException(
          'Erro ao remover o filme da lista de espera',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return 'Filme removido da lista de espera com sucesso';
    } catch (error) {
      throw new HttpException(
        `Erro ao remover o filme da lista de espera: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async isWaitingMovie(idUser: number, idTmdb: number): Promise<boolean> {
    try {
      const waitingMovie = await this.waitingMovieRepository.findOne({
        where: {
          user: { id: idUser },
          idTmdb: idTmdb
        },
      });
      return waitingMovie ? true : false;
    } catch (error) {
      throw new HttpException(
        `Erro ao verificar se o filme foi assistido: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}