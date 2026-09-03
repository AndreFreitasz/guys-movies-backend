import {
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatedSerieDto } from './created-serie.dto';

export class MarkSeasonDto {
  @IsInt()
  @Min(1)
  idTmdb: number;

  @IsInt()
  @Min(1)
  seasonNumber: number;

  @IsOptional()
  @IsDateString()
  watchedAt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatedSerieDto)
  createSerieDto?: CreatedSerieDto;
}
