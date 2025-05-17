import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movies } from '../entities/movies.entity';
import { CreatedMovieDto } from '../dto/created-movie.dto';

@Injectable()
export class CreatedMovieService {
  constructor(
    @InjectRepository(Movies)
    private readonly movieRepository: Repository<Movies>,
  ) {}

  async checkIfMovieExists(idTmdb: string): Promise<number> {
    const count = await this.movieRepository.count({ where: { idTmdb } });
    return count;
  }

  async findMovieByIdTmdb(idTmdb: string): Promise<Movies> {
    return this.movieRepository.findOne({ where: { idTmdb } });
  }

  async createMovie(createMovieDto: CreatedMovieDto): Promise<{ message: string }> {
    const { idTmdb } = createMovieDto;
    try {
      const existingMovieCount = await this.checkIfMovieExists(idTmdb);
      if (existingMovieCount > 0) {
        return { message: 'O filme já está cadastrado' };
      }

      const movie = this.movieRepository.create(createMovieDto);
      await this.movieRepository.save(movie);
      return { message: 'Filme cadastrado com sucesso' };
    } catch (error) {
      throw new HttpException(
        `Erro ao cadastrar o filme: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
