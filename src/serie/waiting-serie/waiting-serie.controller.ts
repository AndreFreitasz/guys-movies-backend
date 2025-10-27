import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { WaitingSerieService } from './waiting-serie.service'
import { CreatedSerieDto } from '../dto/created-serie.dto';
import { IsWaitingSerieDto } from '../dto/is-waiting-serie.dto';
import { SerieDto } from '../dto/serie.dto';

@Controller('waitingSerie')
export class WaitingSerieController {
  constructor(private readonly waitingSerieService: WaitingSerieService) {}

  private normalizeSeriePayload(
    seriePayload?: Partial<CreatedSerieDto & SerieDto>,
  ): CreatedSerieDto {
    if (!seriePayload) {
      throw new HttpException(
        'Dados da série são obrigatórios',
        HttpStatus.BAD_REQUEST,
      );
    }

    const name = seriePayload.name;
    const overview = seriePayload.overview;
    const firstAirDate =
      seriePayload.firstAirDate ?? seriePayload.first_air_date;
    const idTmdb = seriePayload.idTmdb ?? seriePayload.id;
    const posterPath =
      seriePayload.posterPath ?? seriePayload.poster_path ?? null;
    const numberOfSeasons =
      seriePayload.numberOfSeasons ?? seriePayload.number_of_seasons ?? null;
    const voteAverage =
      seriePayload.voteAverage ?? seriePayload.vote_average ?? null;

    if (!name || !overview || !firstAirDate || !idTmdb) {
      throw new HttpException(
        'Campos obrigatórios da série ausentes',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      name,
      overview,
      firstAirDate,
      idTmdb,
      posterPath,
      numberOfSeasons,
      voteAverage,
    };
  }

  @Post()
  async markAsWaiting(
    @Body()
    body: {
      userId: number;
      createdSerieDto?: CreatedSerieDto;
      createSerieDto?: CreatedSerieDto;
      serieDto?: SerieDto;
    },
    @Res() res: Response
  ) {
    const { userId, createdSerieDto, createSerieDto, serieDto } = body;
    const serieData = this.normalizeSeriePayload(
      createdSerieDto ?? serieDto ?? createSerieDto,
    );

    const message = await this.waitingSerieService.markAsWaiting(
      userId,
      serieData,
    );
    if (message === 'Série retirada da lista de espera') {
      return res.status(HttpStatus.OK).json({ message });
    }
    return res.status(HttpStatus.CREATED).json({ message });
  }

  @Get('isWaiting')
  async isWaiting(@Query() query: IsWaitingSerieDto, @Res() res: Response) {
    const waiting = await this.waitingSerieService.isWaitingSerie(query.userId, query.idTmdb);
    return res.status(HttpStatus.OK).json({ waiting });
  }
}
