import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WaitingMovieService } from './waiting-movie.service';
import { IsWaitingMovieDto } from '../dto/is-waiting.dto';
import { MarkWaitingMovieDto } from '../dto/mark-waiting.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('waitingMovie')
@UseGuards(JwtAuthGuard)
export class WaitingMovieController {
  constructor(private readonly waitingMovieService: WaitingMovieService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async markAsWaiting(
    @CurrentUser('id') userId: number,
    @Body() body: MarkWaitingMovieDto,
  ) {
    const message = await this.waitingMovieService.markAsWaiting(
      userId,
      body.createMovieDto,
    );
    return {
      message,
      unmarked: message === 'Filme retirado da lista de espera',
    };
  }

  @Get('isWaiting')
  async isWaiting(
    @CurrentUser('id') userId: number,
    @Query() query: IsWaitingMovieDto,
  ) {
    const waiting = await this.waitingMovieService.isWaitingMovie(
      userId,
      query.idTmdb,
    );
    return { waiting };
  }
}
