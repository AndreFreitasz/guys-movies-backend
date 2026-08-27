import { Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import { CreatedSerieDto } from './created-serie.dto';

export class MarkWaitingSerieDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CreatedSerieDto)
  createSerieDto: CreatedSerieDto;
}
