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

export class WatchlistDto {
  items: WatchlistItemDto[];
}

export class WatchlistProviderDto {
  id: number;
  name: string;
  logoPath: string | null;
}

export class WatchlistAvailabilityItemDto {
  type: WatchlistItemType;
  idTmdb: number;
  providers: WatchlistProviderDto[];
}

export class WatchlistAvailabilityDto {
  items: WatchlistAvailabilityItemDto[];
  failed: boolean;
}
