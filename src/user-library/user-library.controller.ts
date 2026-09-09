import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserLibraryService } from './user-library.service';
import { UserLibraryDto } from './dto/user-library.dto';
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
}
