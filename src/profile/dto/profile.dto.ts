import { FavoriteType } from '../../users/entities/favorite-title.entity';

export type { FavoriteType };

export class FavoriteDto {
  type: FavoriteType;
  idTmdb: number;
  title: string;
  posterPath: string | null;
  year: number | null;
  position: number;
}

export class CoverDto {
  type: FavoriteType;
  idTmdb: number;
  title: string;
  backdropPath: string | null;
}

export class CoverOptionDto {
  type: FavoriteType;
  idTmdb: number;
  title: string;
  backdropPath: string | null;
}

export class ProfileCountsDto {
  followers: number;
  following: number;
  movies: number;
  episodes: number;
}

export class ProfileDto {
  id: number;
  username: string;
  name: string;
  bio: string | null;
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  counts: ProfileCountsDto;
  favorites: FavoriteDto[];
  cover: CoverDto | null;
  joinedAt: string | null;
  avatarUpdatedAt: string | null;
}

export class UserSummaryDto {
  username: string;
  name: string;
  isSelf: boolean;
  isFollowing: boolean;
  avatarUpdatedAt: string | null;
}

export class UserListDto {
  users: UserSummaryDto[];
  nextCursor: string | null;
}

export class TimelineMovieEventDto {
  kind: 'movie';
  idTmdb: number;
  title: string;
  posterPath: string | null;
  rating: number | null;
  occurredAt: string;
}

export class TimelineSeasonEventDto {
  kind: 'season';
  idTmdb: number;
  title: string;
  posterPath: string | null;
  seasonNumber: number;
  episodeCount: number;
  occurredAt: string;
}

export type TimelineEventDto = TimelineMovieEventDto | TimelineSeasonEventDto;

export class TimelineDto {
  events: TimelineEventDto[];
  nextCursor: string | null;
}

export class UserStatsDto {
  movies: number;
  series: number;
  episodes: number;
  serieRuntimeMinutes: number;
}
