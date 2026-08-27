export class WatchedMovieListItemDto {
  idTmdb: number;
  title: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  director: string | null;
  voteAverage: number | null;
  rating: number | null;
  watchedAt: string | null;
  createdAt: string;
}

export class WatchedMovieStatsDto {
  total: number;
  rated: number;
  averageRating: number | null;
  lastWatchedAt: string | null;
}

export class WatchedMovieListDto {
  items: WatchedMovieListItemDto[];
  stats: WatchedMovieStatsDto;
}
