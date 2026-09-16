import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WatchTogetherService } from './watch-together.service';
import {
  AcceptCompanionDto,
  PendingCompanionDto,
  TagCompanionDto,
} from './dto/watch-together.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('me/watch-together')
@UseGuards(JwtAuthGuard)
export class WatchTogetherController {
  constructor(private readonly watchTogetherService: WatchTogetherService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async tag(
    @CurrentUser('id') userId: number,
    @Body() body: TagCompanionDto,
  ): Promise<void> {
    await this.watchTogetherService.tag(userId, body);
  }

  @Get('pending')
  async pending(
    @CurrentUser('id') userId: number,
  ): Promise<PendingCompanionDto[]> {
    const rows = await this.watchTogetherService.listPending(userId);

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      idTmdb: row.idTmdb,
      seasonNumber: row.seasonNumber,
      watchedAt: row.watchedAt,
      requester: {
        username: row.requester?.username ?? '',
        name: row.requester?.name ?? '',
        avatarUpdatedAt: null,
      },
    }));
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  async accept(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AcceptCompanionDto,
  ): Promise<void> {
    await this.watchTogetherService.accept(userId, id, body.rating);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reject(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.watchTogetherService.reject(userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.watchTogetherService.remove(userId, id);
  }
}
