import { Type } from 'class-transformer';
import { IsDateString, IsObject, ValidateNested } from 'class-validator';
import { CreatedSerieDto } from './created-serie.dto';

export class MarkWatchedSerieDto {
  @IsDateString()
  watchedAt: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CreatedSerieDto)
  createSerieDto: CreatedSerieDto;
}
