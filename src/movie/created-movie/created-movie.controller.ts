import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreatedMovieService } from './created-movie.service';
import { CreatedMovieDto } from '../dto/created-movie.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('createdMovie')
@UseGuards(JwtAuthGuard)
export class CreatedMovieController {
  constructor(private readonly createdMovieService: CreatedMovieService) {}

  @Post()
  async create(@Body() createdMovieDto: CreatedMovieDto) {
    return this.createdMovieService.createMovie(createdMovieDto);
  }
}
