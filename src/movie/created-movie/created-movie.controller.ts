import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreatedMovieService } from './created-movie.service';
import { CreatedMovieDto } from '../dto/created-movie.dto';

@Controller('createdMovie')
export class CreatedMovieController {
  constructor(private readonly createdMovieService: CreatedMovieService) {}

  @Post()
  async create(@Body() createdMovieDto: CreatedMovieDto) {
    return this.createdMovieService.createMovie(createdMovieDto);
  }
}
