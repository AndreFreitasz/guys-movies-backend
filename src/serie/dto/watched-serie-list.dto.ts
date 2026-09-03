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
  completedAt: string | null;
  watchedSeasons: number;
  watchedEpisodes: number;
  episodeRunTime: number | null;
}

export class SeasonProgressDto {
  watchedSeasons: number;
  watchedEpisodes: number;
  completedAt: string | null;
}

export class WatchedSerieStatsDto {
  total: number;
  completed: number;
  inProgress: number;
  seasons: number;
  episodes: number;
  runtimeMinutes: number;
  averageRating: number | null;
  lastActivityAt: string | null;
}

export class WatchedSerieListDto {
  items: WatchedSerieListItemDto[];
  stats: WatchedSerieStatsDto;
}
