import { Body, Controller, Get, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { WatchedSerieService } from './watched-serie.service';
import { Response } from 'express';
import { SerieDto } from '../dto/serie.dto';
import { IsWatchedSerieDto } from '../dto/is-watched-serie.dto';
import { GetRateSerieDto } from '../dto/get-rate-serie.dto';

@Controller('watchedSerie')
export class WatchedSerieController {
  constructor(private readonly watchedSerieService: WatchedSerieService) {}

  @Post()
  async markAsWatched(
    @Body() { watchedAt, userId, serieDto }: { watchedAt: Date; userId: number; serieDto: SerieDto },
    @Res() res: Response,
  ) {
    const message = await this.watchedSerieService.markAsWatched(watchedAt, userId, serieDto);
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
