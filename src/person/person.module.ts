import { Module } from '@nestjs/common';
import { PersonController } from './person.controller';
import { PersonService } from './person.service';
import { GenreMapService } from './genre-map.service';

@Module({
  controllers: [PersonController],
  providers: [PersonService, GenreMapService],
  exports: [PersonService],
})
export class PersonModule {}
