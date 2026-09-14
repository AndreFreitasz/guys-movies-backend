import { Controller, Get, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UserStatsDto } from './dto/profile.dto';
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
}
