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
import { WaitingSerieService } from './waiting-serie.service';
import { IsWaitingSerieDto } from '../dto/is-waiting-serie.dto';
import { MarkWaitingSerieDto } from '../dto/mark-waiting-serie.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('waitingSerie')
@UseGuards(JwtAuthGuard)
export class WaitingSerieController {
  constructor(private readonly waitingSerieService: WaitingSerieService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async markAsWaiting(
    @CurrentUser('id') userId: number,
    @Body() body: MarkWaitingSerieDto,
  ) {
    const message = await this.waitingSerieService.markAsWaiting(
      userId,
      body.createSerieDto,
    );
    return {
      message,
      unmarked: message === 'Série retirada da lista de espera',
    };
  }

  @Get('isWaiting')
  async isWaiting(
    @CurrentUser('id') userId: number,
    @Query() query: IsWaitingSerieDto,
  ) {
    const waiting = await this.waitingSerieService.isWaitingSerie(
      userId,
      query.idTmdb,
    );
    return { waiting };
  }
}
