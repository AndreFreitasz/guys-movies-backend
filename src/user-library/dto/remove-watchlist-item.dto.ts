import { IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WatchlistItemType } from './watchlist.dto';

export class RemoveWatchlistItemDto {
  @IsIn(['movie', 'serie'])
  type: WatchlistItemType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTmdb: number;
}
