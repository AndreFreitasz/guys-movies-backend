import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProfileService } from './profile.service';
import { TimelineService } from './timeline.service';
import {
  FavoriteDto,
  ProfileDto,
  UserListDto,
  UserStatsDto,
  TimelineDto,
} from './dto/profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetFavoritesDto } from './dto/set-favorites.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly timelineService: TimelineService,
  ) {}

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

  @Get('profiles/:username/followers')
  async followers(
    @CurrentUser('id') viewerId: number,
    @Param('username') username: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<UserListDto> {
    return this.profileService.listFollowers(
      viewerId,
      username,
      cursor,
      limit ? Number.parseInt(limit, 10) : undefined,
    );
  }

  @Get('profiles/:username/following')
  async following(
    @CurrentUser('id') viewerId: number,
    @Param('username') username: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<UserListDto> {
    return this.profileService.listFollowing(
      viewerId,
      username,
      cursor,
      limit ? Number.parseInt(limit, 10) : undefined,
    );
  }

  @Patch('me/profile')
  async updateProfile(
    @CurrentUser('id') userId: number,
    @Body() body: UpdateProfileDto,
  ): Promise<{ bio: string | null }> {
    return this.profileService.updateBio(userId, body.bio);
  }

  @Put('me/profile/favorites')
  async setFavorites(
    @CurrentUser('id') userId: number,
    @Body() body: SetFavoritesDto,
  ): Promise<FavoriteDto[]> {
    return this.profileService.setFavorites(userId, body.favorites);
  }

  @Get('profiles/:username/timeline')
  async timeline(
    @Param('username') username: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<TimelineDto> {
    return this.timelineService.getTimeline(
      username,
      cursor,
      limit ? Number.parseInt(limit, 10) : undefined,
    );
  }
}
