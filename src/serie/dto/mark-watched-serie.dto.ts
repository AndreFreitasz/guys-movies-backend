import { Type } from 'class-transformer';
import {
  IsDateString,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreatedSerieDto } from './created-serie.dto';

export class MarkWatchedSerieDto {
  @IsOptional()
  @IsDateString()
  watchedAt?: string | null;

  @IsObject()
  @ValidateNested()
  @Type(() => CreatedSerieDto)
  createSerieDto: CreatedSerieDto;
}
