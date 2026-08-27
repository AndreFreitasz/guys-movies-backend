import { Type } from 'class-transformer';
import { IsDateString, IsObject, ValidateNested } from 'class-validator';
import { CreatedMovieDto } from './created-movie.dto';

export class MarkWatchedMovieDto {
  @IsDateString()
  watchedAt: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CreatedMovieDto)
  createMovieDto: CreatedMovieDto;
}
