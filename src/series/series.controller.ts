import { Controller, Get, Param, Query } from '@nestjs/common';
import { SeriesService } from './series.service';
import { Series } from './interfaces/series.interface';
import { Provider } from './interfaces/provider.interface';

@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Get('popular')
  getTopSeries(): Promise<Series[]> {
    return this.seriesService.getTopSeries();
  }

  @Get('popularByProviders')
  getAllTopSeriesByProviders(): Promise<
    { provider: Provider; series: Series[] }[]
  > {
    return this.seriesService.getAllTopSeriesByProviders();
  }

  @Get('popularByGenres/:genreId')
  getTopSeriesByGenres(@Param('genreId') genreId: number): Promise<Series[]> {
    return this.seriesService.getTopSeriesByGenres(genreId);
  }

  @Get('topRated')
  getTopRatedSeries(): Promise<Series[]> {
    return this.seriesService.getTopRatedSeries();
  }

  @Get('search')
  searchSeries(@Query('query') query: string): Promise<Series[]> {
    return this.seriesService.searchSeries(query);
  }
}
