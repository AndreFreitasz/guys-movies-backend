import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserLibraryService } from './user-library.service';
import { UserLibraryDto } from './dto/user-library.dto';
import { WatchlistDto, WatchlistAvailabilityDto } from './dto/watchlist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UserLibraryController {
  constructor(private readonly userLibraryService: UserLibraryService) {}

  @Get('library')
  async getLibrary(
    @CurrentUser('id') userId: number,
  ): Promise<UserLibraryDto> {
    return this.userLibraryService.getLibrary(userId);
  }

  @Get('watchlist')
  async getWatchlist(
    @CurrentUser('id') userId: number,
  ): Promise<WatchlistDto> {
    return this.userLibraryService.getWatchlist(userId);
  }

  @Get('watchlist/availability')
  async getWatchlistAvailability(
    @CurrentUser('id') userId: number,
  ): Promise<WatchlistAvailabilityDto> {
    return this.userLibraryService.getWatchlistAvailability(userId);
  }
}
