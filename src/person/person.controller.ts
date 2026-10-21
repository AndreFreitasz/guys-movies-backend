import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { PersonService } from './person.service';
import { CreditSort } from './query';
import { MediaType } from './interfaces/person.interface';

@Controller('person')
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Get('search')
  search(@Query('q') term: string) {
    return this.personService.search(term);
  }

  @Get(':id')
  getProfile(@Param('id', ParseIntPipe) id: number) {
    return this.personService.getProfile(id);
  }

  @Get(':id/credits')
  getCredits(
    @Param('id', ParseIntPipe) id: number,
    @Query('department') department?: string,
    @Query('media') media?: MediaType | 'all',
    @Query('genre') genre?: string,
    @Query('sort') sort?: CreditSort,
    @Query('page') page?: string,
  ) {
    return this.personService.getCredits(id, {
      department,
      media,
      genre: genre ? Number(genre) : undefined,
      sort,
      page: page ? Number(page) : 1,
    });
  }
}
