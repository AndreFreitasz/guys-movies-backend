import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CreatedSerieDto } from "../dto/created-serie.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { WaitingSeries } from "../entities/waiting-serie.entity";
import { Repository } from "typeorm";
import { User } from "src/users/entities/user.entity";
import { Series } from "../entities/series.entity";
import { CreatedSerieService } from "../created-serie/created-serie.service";

@Injectable()
export class WaitingSerieService {
  constructor(
    @InjectRepository(WaitingSeries)
    private readonly waitingSerieRepository: Repository<WaitingSeries>,
    private readonly createdSerieService: CreatedSerieService
  ) {}

  async markAsWaiting(userId: number, createdSerieDto: CreatedSerieDto): Promise<string> {
    await this.createdSerieService.createSerie(createdSerieDto);
    const serie = await this.createdSerieService.findSerieByIdTmdb(createdSerieDto.idTmdb);

    if (!serie) {
      throw new HttpException(
        'Série não encontrada para cadastro',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const existingWaitingSerie = await this.waitingSerieRepository.findOne({
        where: {
          user: { id: userId },
          serie: { id: serie.id },
        },
      });
      if (existingWaitingSerie) {
        await this.destroyWaitingSerie(userId, serie.id);
        return 'Série retirada da lista de espera';
      }
      const waitingSerie = this.waitingSerieRepository.create({
        user: { id: userId } as User,
        serie: { id: serie.id } as Series,
        idTmdb: createdSerieDto.idTmdb,
      });
      await this.waitingSerieRepository.save(waitingSerie);
      return 'Série adicionada na lista de espera';
    } catch (error){
      throw new HttpException(
        `Erro ao atualizar a série da sua lista de espera: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async destroyWaitingSerie(userId: number, serieId: number): Promise<string> {
    try {
      const result = await this.waitingSerieRepository.delete({
        user: { id: userId },
        serie: { id: serieId },
      });
      if (result.affected === 0) {
        throw new HttpException(
          'Erro ao remover a série da lista de espera',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return 'Série removida da lista de espera com sucesso';
    } catch (error) {
      throw new HttpException(
        `Erro ao remover a série da lista de espera: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async isWaitingSerie(idUser: number, idTmdb: number): Promise<boolean> {
    try {
      const waitingSerie = await this.waitingSerieRepository.findOne({
        where: {
          user: { id: idUser },
          idTmdb: idTmdb
        },
      });
      return waitingSerie ? true : false;
    } catch (error) {
      throw new HttpException(
        `Erro ao verificar se a série está na lista de espera: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
