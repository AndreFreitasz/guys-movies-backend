import {
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatedSerieDto } from './created-serie.dto';

export class CompleteSerieDto {
  @IsInt()
  @Min(1)
  idTmdb: number;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatedSerieDto)
  createSerieDto?: CreatedSerieDto;
}
