import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';
import { TimelineDto, TimelineEventDto } from './dto/profile.dto';
import { decodeCursor, encodeCursor } from './cursor';
import { WatchTogetherService, titleKey } from './watch-together.service';

const SOURCE_LIMIT = 500;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MOVIE_RANK = 1;
const SEASON_RANK = 0;

interface SortKey {
  occurredAt: string;
  rank: number;
  id: number;
}

interface RankedEvent {
  event: TimelineEventDto;
  rank: number;
  id: number;
}

const toDateOnly = (value: Date | string | null): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

@Injectable()
export class TimelineService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WatchedMovie)
    private readonly watchedMovieRepository: Repository<WatchedMovie>,
    private readonly watchTogetherService: WatchTogetherService,
    @InjectRepository(WatchedSeason)
    private readonly watchedSeasonRepository: Repository<WatchedSeason>,
  ) {}

  private resolvePageSize(limit?: number): number {
    if (!Number.isInteger(limit) || !limit || limit < 1) {
      return DEFAULT_PAGE_SIZE;
    }
    return Math.min(limit, MAX_PAGE_SIZE);
  }

  private compareKeys(first: SortKey, second: SortKey): number {
    if (first.occurredAt !== second.occurredAt) {
      return first.occurredAt < second.occurredAt ? 1 : -1;
    }
    if (first.rank !== second.rank) return second.rank - first.rank;
    return second.id - first.id;
  }

  private keyOf(item: RankedEvent): SortKey {
    return {
      occurredAt: item.event.occurredAt,
      rank: item.rank,
      id: item.id,
    };
  }

  async getTimeline(
    username: string,
    cursor?: string,
    limit?: number,
  ): Promise<TimelineDto> {
    const owner = await this.userRepository.findOne({
      where: { username: ILike(username) },
      select: ['id'],
    });

    if (!owner) {
      throw new NotFoundException('Perfil nao encontrado');
    }

    const pageSize = this.resolvePageSize(limit);

    const [movies, seasons] = await Promise.all([
      this.watchedMovieRepository.find({
        where: { idUser: { id: owner.id } },
        relations: { idMovie: true },
        order: { watchedAt: 'DESC', id: 'DESC' },
        take: SOURCE_LIMIT,
      }),
      this.watchedSeasonRepository.find({
        where: { user: { id: owner.id } },
        relations: { serie: true },
        order: { watchedAt: 'DESC', id: 'DESC' },
        take: SOURCE_LIMIT,
      }),
    ]);

    const ranked: RankedEvent[] = [];

    const companions = await this.watchTogetherService.companionsFor(owner.id);

    movies.forEach(row => {
      if (!row.idMovie) return;
      const occurredAt = toDateOnly(row.watchedAt) ?? toDateOnly(row.createdAt);
      if (!occurredAt) return;

      ranked.push({
        rank: MOVIE_RANK,
        id: row.id,
        event: {
          kind: 'movie',
          idTmdb: row.idTmdb,
          title: row.idMovie.title,
          posterPath: row.idMovie.posterPath ?? null,
          rating: row.rating ?? null,
          occurredAt,
          companions: companions.get(titleKey('movie', row.idTmdb, null)) ?? [],
        },
      });
    });

    seasons.forEach(row => {
      if (!row.serie) return;
      const occurredAt = toDateOnly(row.watchedAt) ?? toDateOnly(row.createdAt);
      if (!occurredAt) return;

      ranked.push({
        rank: SEASON_RANK,
        id: row.id,
        event: {
          kind: 'season',
          idTmdb: row.idTmdb,
          title: row.serie.name,
          posterPath: row.serie.posterPath ?? null,
          seasonNumber: row.seasonNumber,
          episodeCount: row.episodeCount,
          occurredAt,
          companions:
            companions.get(titleKey('serie', row.idTmdb, row.seasonNumber)) ??
            [],
        },
      });
    });

    ranked.sort((first, second) =>
      this.compareKeys(this.keyOf(first), this.keyOf(second)),
    );

    const parsed = decodeCursor(cursor);
    const remaining = parsed
      ? ranked.filter(
          candidate => this.compareKeys(this.keyOf(candidate), parsed) > 0,
        )
      : ranked;

    const page = remaining.slice(0, pageSize);
    const hasMore = remaining.length > pageSize;
    const last = page[page.length - 1];

    return {
      events: page.map(item => item.event),
      nextCursor:
        hasMore && last
          ? encodeCursor({
              occurredAt: last.event.occurredAt,
              rank: last.rank,
              id: last.id,
            })
          : null,
    };
  }
}
