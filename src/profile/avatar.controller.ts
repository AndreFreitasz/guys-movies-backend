import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AvatarService } from './avatar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

@Controller()
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Get('users/:username/avatar')
  async read(
    @Param('username') username: string,
    @Res() response: Response,
  ): Promise<void> {
    const stored = await this.avatarService.findByUsername(username);

    if (!stored) {
      response.status(HttpStatus.NOT_FOUND).end();
      return;
    }

    response.setHeader('Content-Type', stored.contentType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('Content-Length', stored.data.length);
    response.end(stored.data);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ avatarUpdatedAt: string }> {
    const { updatedAt } = await this.avatarService.save(userId, file);
    return { avatarUpdatedAt: updatedAt.toISOString() };
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser('id') userId: number): Promise<void> {
    await this.avatarService.remove(userId);
  }
}
