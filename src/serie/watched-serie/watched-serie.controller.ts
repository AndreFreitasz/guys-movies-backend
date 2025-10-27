import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { WatchedSerieService } from './watched-serie.service';
import { Response } from 'express';
import { SerieDto } from '../dto/serie.dto';
import { IsWatchedSerieDto } from '../dto/is-watched-serie.dto';
import { GetRateSerieDto } from '../dto/get-rate-serie.dto';
import { CreatedSerieDto } from '../dto/created-serie.dto';

@Controller('watchedSerie')
export class WatchedSerieController {
  constructor(private readonly watchedSerieService: WatchedSerieService) {}

  private normalizeSeriePayload(
    seriePayload?: Partial<SerieDto & CreatedSerieDto>,
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
  async markAsWatched(
    @Body()
    body: {
      watchedAt: Date;
      userId: number;
      serieDto?: SerieDto;
      createSerieDto?: CreatedSerieDto;
    },
    @Res() res: Response,
  ) {
    const { watchedAt, userId, serieDto, createSerieDto } = body;
    const serieData = this.normalizeSeriePayload(serieDto ?? createSerieDto);

    const message = await this.watchedSerieService.markAsWatched(
      watchedAt,
      userId,
      serieData,
    );
    if (message === 'Série desmarcada com sucesso') {
      return res.status(HttpStatus.OK).json({ message });
    }
    return res.status(HttpStatus.CREATED).json({ message });
  }

  @Get('isWatched')
  async isWatched(@Query() query: IsWatchedSerieDto, @Res() res: Response) {
    const watched = await this.watchedSerieService.isWatchedSerie(query.userId, query.idTmdb);
    return res.status(HttpStatus.OK).json({ watched });
  }

  @Post('rate')
  async rateSerie(
    @Body() { userId, idTmdb, rating }: { userId: number; idTmdb: number; rating: number },
    @Res() res: Response,
  ) {
    const message = await this.watchedSerieService.rateSerie(userId, idTmdb, rating);
    return res.status(HttpStatus.OK).json({ message });
  }

  @Get('getRate')
  async getRate(@Query() query: GetRateSerieDto, @Res() res: Response) {
    const rate = await this.watchedSerieService.getSerieRating(query.userId, query.idTmdb);
    return res.status(HttpStatus.OK).json({ rate });
  }
}
