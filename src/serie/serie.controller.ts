import { Controller, Get, Param } from '@nestjs/common';
import { SerieService } from './serie.service';
import { SerieDto } from './dto/serie.dto';

@Controller('serie')
export class SerieController {
  constructor(private readonly serieService: SerieService) {}

  @Get(':idSerie')
  getSerie(@Param('idSerie') idSerie: number): Promise<SerieDto> {
    return this.serieService.getSerieData(idSerie);
  }
}
