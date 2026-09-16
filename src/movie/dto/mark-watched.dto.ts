import { Type } from 'class-transformer';
import {
  IsDateString,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreatedMovieDto } from './created-movie.dto';

export class MarkWatchedMovieDto {
  @IsOptional()
  @IsDateString()
  watchedAt?: string | null;

  @IsObject()
  @ValidateNested()
  @Type(() => CreatedMovieDto)
  createMovieDto: CreatedMovieDto;
}
