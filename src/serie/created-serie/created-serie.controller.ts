import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreatedSerieService } from './created-serie.service';
import { CreatedSerieDto } from '../dto/created-serie.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('createdSerie')
@UseGuards(JwtAuthGuard)
export class CreatedSerieController {
  constructor(private readonly createdSerieService: CreatedSerieService) {}

  @Post()
  async create(@Body() createdSerieDto: CreatedSerieDto) {
    return this.createdSerieService.createSerie(createdSerieDto);
  }
}
