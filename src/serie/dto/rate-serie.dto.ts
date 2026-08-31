import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatedSerieDto } from './created-serie.dto';

export class RateSerieDto {
  @IsInt()
  @Min(1)
  idTmdb: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreatedSerieDto)
  createSerieDto?: CreatedSerieDto;
}
