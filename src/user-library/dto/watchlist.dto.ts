export type WatchlistItemType = 'movie' | 'serie';

export class WatchlistItemDto {
  type: WatchlistItemType;
  idTmdb: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  addedAt: string;
  watched: boolean;
}

export class WatchlistStatsDto {
  total: number;
  movies: number;
  series: number;
}

export class WatchlistDto {
  items: WatchlistItemDto[];
  stats: WatchlistStatsDto;
}
