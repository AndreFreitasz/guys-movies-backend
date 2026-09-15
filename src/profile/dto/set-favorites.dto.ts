import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

export class FavoriteInputDto {
  @IsIn(['movie', 'serie'])
  type: 'movie' | 'serie';

  @IsInt()
  @Min(1)
  idTmdb: number;
}

export class SetFavoritesDto {
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => FavoriteInputDto)
  favorites: FavoriteInputDto[];
}
