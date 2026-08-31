export class WatchedSerieListItemDto {
  idTmdb: number;
  name: string | null;
  overview: string | null;
  posterPath: string | null;
  firstAirDate: string | null;
  numberOfSeasons: number | null;
  voteAverage: number | null;
  rating: number | null;
  watchedAt: string | null;
  createdAt: string;
}
