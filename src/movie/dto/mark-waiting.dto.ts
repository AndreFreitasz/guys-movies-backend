import { Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import { CreatedMovieDto } from './created-movie.dto';

export class MarkWaitingMovieDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CreatedMovieDto)
  createMovieDto: CreatedMovieDto;
}
