import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class CoverInputDto {
  @IsIn(['movie', 'serie'])
  type: 'movie' | 'serie';

  @IsInt()
  @Min(1)
  idTmdb: number;
}

export class SetCoverDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CoverInputDto)
  cover: CoverInputDto | null;
}
