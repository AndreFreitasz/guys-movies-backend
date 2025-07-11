import { Body, Controller, Get, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { WaitingSerieService } from './waiting-serie.service'
import { CreatedSerieDto } from '../dto/created-serie.dto';
import { IsWaitingSerieDto } from '../dto/is-waiting-serie.dto';

@Controller('waitingSerie')
export class WaitingSerieController {
  constructor(private readonly waitingSerieService: WaitingSerieService) {}

  @Post()
  async markAsWaiting(
    @Body() { userId, createdSerieDto }: { userId: number; createdSerieDto: CreatedSerieDto },
    @Res() res: Response
  ) {
    const message = await this.waitingSerieService.markAsWaiting(userId, createdSerieDto);
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
