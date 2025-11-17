import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchResult } from './interfaces/search-result.interface';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  searchAll(@Query('query') query: string): Promise<SearchResult[]> {
    return this.searchService.searchAll(query);
  }
}
