import { ConflictException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Series } from '../entities/series.entity';
import { CreatedSerieDto } from '../dto/created-serie.dto';

@Injectable()
export class CreatedSerieService {
  constructor(
    @InjectRepository(Series)
    private readonly serieRepository: Repository<Series>,
  ) {}

  async checkIfSerieExists(idTmdb: number): Promise<number> {
    const count = await this.serieRepository.count({ where: { idTmdb } });
    return count;
  }

  async findSerieByIdTmdb(idTmdb: number): Promise<Series> {
    return this.serieRepository.findOne({ where: { idTmdb } });
  }

  async createSerie(createSerieDto: CreatedSerieDto): Promise<{ message: string }> {
    const { idTmdb } = createSerieDto;
    try {
      const existingSerieCount = await this.checkIfSerieExists(idTmdb);
      if (existingSerieCount > 0) {
        return { message: 'A série já está cadastrada' };
      }
      const serie = this.serieRepository.create(createSerieDto);
      await this.serieRepository.save(serie);
      return { message: 'Série cadastrada com sucesso' };
    } catch (error) {
      throw new HttpException(
        `Erro ao cadastrar a série: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
