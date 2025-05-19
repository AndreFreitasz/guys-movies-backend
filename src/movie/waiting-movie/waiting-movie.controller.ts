import { Body, Controller, Get, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { WaitingMovieService } from './waiting-movie.service';
import { CreatedMovieDto } from '../dto/created-movie.dto';
import { IsWaitingMovieDto } from '../dto/is-waiting.dto';

@Controller('waitingMovie')
export class WaitingMovieController {
  constructor(private readonly waitingMovieService: WaitingMovieService) {}

  @Post()
  async markAsWaiting(
    @Body() { userId, createMovieDto }: { userId: number; createMovieDto: CreatedMovieDto },
    @Res() res: Response
  ) {
    const message = await this.waitingMovieService.markAsWaiting(userId, createMovieDto);
    if (message === 'Filme retirado da lista de espera') {
      return res.status(HttpStatus.OK).json({ message });
    }
    return res.status(HttpStatus.CREATED).json({ message });
  }

  @Get('isWaiting')
  async isWaiting(@Query() query: IsWaitingMovieDto, @Res() res: Response) {
    const waiting = await this.waitingMovieService.isWaitingMovie(query.userId, query.idTmdb);
    return res.status(HttpStatus.OK).json({ waiting });
  }
  
}
