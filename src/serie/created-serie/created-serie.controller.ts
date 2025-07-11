import { Body, Controller, Post } from '@nestjs/common';
import { CreatedSerieService } from './created-serie.service';
import { CreatedSerieDto } from '../dto/created-serie.dto';

@Controller('createdSerie')
export class CreatedSerieController {
  constructor(private readonly createdSerieService: CreatedSerieService) {}

  @Post()
  async create(@Body() createdSerieDto: CreatedSerieDto) {
    return this.createdSerieService.createSerie(createdSerieDto);
  }
}
