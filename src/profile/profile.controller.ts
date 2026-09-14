import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProfileService } from './profile.service';
import { ProfileDto, UserStatsDto } from './dto/profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me/stats')
  async getStats(@CurrentUser('id') userId: number): Promise<UserStatsDto> {
    return this.profileService.getStats(userId);
  }

  @Get('profiles/:username')
  async getProfile(
    @CurrentUser('id') viewerId: number,
    @Param('username') username: string,
  ): Promise<ProfileDto> {
    return this.profileService.getProfile(viewerId, username);
  }

  @Post('profiles/:username/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async follow(
    @CurrentUser('id') viewerId: number,
    @Param('username') username: string,
  ): Promise<void> {
    await this.profileService.followUser(viewerId, username);
  }

  @Delete('profiles/:username/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async unfollow(
    @CurrentUser('id') viewerId: number,
    @Param('username') username: string,
  ): Promise<void> {
    await this.profileService.unfollowUser(viewerId, username);
  }
}
