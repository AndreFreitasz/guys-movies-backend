import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Equal, ILike, In, LessThan, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Follow } from '../users/entities/follow.entity';
import { FavoriteTitle } from '../users/entities/favorite-title.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';
import { UserAvatar } from '../users/entities/user-avatar.entity';
import {
  CoverDto,
  FavoriteDto,
  FavoriteType,
  ProfileCountsDto,
  ProfileDto,
  UserListDto,
  UserStatsDto,
} from './dto/profile.dto';
import {
  encodeCursor,
  decodeCursor,
  encodeOffsetCursor,
  decodeOffsetCursor,
} from './cursor';
import { buildSearchName } from '../users/search-name';
import { normalizeForMatch } from '../search/relevance';

const UNIQUE_VIOLATION = '23505';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(FavoriteTitle)
    private readonly favoriteRepository: Repository<FavoriteTitle>,
    @InjectRepository(WatchedMovie)
    private readonly watchedMovieRepository: Repository<WatchedMovie>,
    @InjectRepository(WatchedSerie)
    private readonly watchedSerieRepository: Repository<WatchedSerie>,
    @InjectRepository(WatchedSeason)
    private readonly watchedSeasonRepository: Repository<WatchedSeason>,
    @InjectRepository(Movies)
    private readonly movieRepository: Repository<Movies>,
    @InjectRepository(Series)
    private readonly serieRepository: Repository<Series>,
    @InjectRepository(UserAvatar)
    private readonly avatarRepository: Repository<UserAvatar>,
  ) {}

  async getStats(userId: number): Promise<UserStatsDto> {
    const [movies, series, seasons] = await Promise.all([
      this.watchedMovieRepository.count({ where: { idUser: { id: userId } } }),
      this.watchedSerieRepository.count({ where: { user: { id: userId } } }),
      this.watchedSeasonRepository.find({
        where: { user: { id: userId } },
        select: { idTmdb: true, episodeCount: true, runtimeMinutes: true },
      }),
    ]);

    const episodes = seasons.reduce(
      (total, season) => total + (season.episodeCount ?? 0),
      0,
    );

    const serieIds = Array.from(new Set(seasons.map(season => season.idTmdb)));
    const serieRows = serieIds.length
      ? await this.serieRepository.find({
          where: { idTmdb: In(serieIds) },
          select: { idTmdb: true, episodeRunTime: true },
        })
      : [];

    const runtimeById = new Map(
      serieRows.map(serie => [serie.idTmdb, serie.episodeRunTime ?? 0]),
    );

    const serieRuntimeMinutes = seasons.reduce(
      (total, season) =>
        total +
        (season.runtimeMinutes ??
          (season.episodeCount ?? 0) * (runtimeById.get(season.idTmdb) ?? 0)),
      0,
    );

    return { movies, series, episodes, serieRuntimeMinutes };
  }

  private yearOf(date: string | null | undefined): number | null {
    if (!date) return null;
    const year = Number.parseInt(String(date).slice(0, 4), 10);
    return Number.isInteger(year) ? year : null;
  }

  private async resolveFavorites(userId: number): Promise<FavoriteDto[]> {
    const rows = await this.favoriteRepository.find({
      where: { user: { id: userId } },
      order: { type: 'ASC', position: 'ASC' },
    });

    if (rows.length === 0) return [];

    const movieIds = rows.filter(r => r.type === 'movie').map(r => r.idTmdb);
    const serieIds = rows.filter(r => r.type === 'serie').map(r => r.idTmdb);

    const [movies, series] = await Promise.all([
      movieIds.length
        ? this.movieRepository.find({ where: { idTmdb: In(movieIds) } })
        : Promise.resolve([]),
      serieIds.length
        ? this.serieRepository.find({ where: { idTmdb: In(serieIds) } })
        : Promise.resolve([]),
    ]);

    const movieById = new Map(movies.map(movie => [movie.idTmdb, movie]));
    const serieById = new Map(series.map(serie => [serie.idTmdb, serie]));

    return rows.reduce<FavoriteDto[]>((accumulator, row) => {
      if (row.type === 'movie') {
        const movie = movieById.get(row.idTmdb);
        if (movie) {
          accumulator.push({
            type: 'movie',
            idTmdb: row.idTmdb,
            title: movie.title,
            posterPath: movie.posterPath ?? null,
            year: this.yearOf(movie.releaseDate),
            position: row.position,
          });
        }
        return accumulator;
      }

      const serie = serieById.get(row.idTmdb);
      if (serie) {
        accumulator.push({
          type: 'serie',
          idTmdb: row.idTmdb,
          title: serie.name,
          posterPath: serie.posterPath ?? null,
          year: this.yearOf(serie.firstAirDate),
          position: row.position,
        });
      }
      return accumulator;
    }, []);
  }

  private async avatarStampsFor(
    userIds: number[],
  ): Promise<Map<number, string>> {
    if (userIds.length === 0) return new Map();

    const rows = await this.avatarRepository.find({
      where: { userId: In(userIds) },
      select: { userId: true, updatedAt: true },
    });

    return new Map(
      rows.map(row => [row.userId, new Date(row.updatedAt).toISOString()]),
    );
  }

  private isoOf(date: Date | null | undefined): string | null {
    if (!date) return null;
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private async resolveCover(
    type: FavoriteType | null,
    idTmdb: number | null,
  ): Promise<CoverDto | null> {
    if (!type || !idTmdb) return null;

    if (type === 'movie') {
      const [movie] = await this.movieRepository.find({
        where: { idTmdb },
        take: 1,
      });
      if (!movie) return null;
      return {
        type,
        idTmdb,
        title: movie.title,
        backdropPath: movie.backdropPath ?? null,
      };
    }

    const [serie] = await this.serieRepository.find({
      where: { idTmdb },
      take: 1,
    });
    if (!serie) return null;
    return {
      type,
      idTmdb,
      title: serie.name,
      backdropPath: serie.backdropPath ?? null,
    };
  }

  private async assertWatched(
    userId: number,
    type: FavoriteType,
    idTmdb: number,
  ): Promise<void> {
    const rows =
      type === 'movie'
        ? await this.watchedMovieRepository.find({
            where: { idUser: { id: userId } },
            select: { idTmdb: true },
          })
        : await this.watchedSerieRepository.find({
            where: { user: { id: userId } },
            select: { idTmdb: true },
          });

    if (!rows.some(row => row.idTmdb === idTmdb)) {
      throw new BadRequestException(
        'So e possivel usar como capa um titulo que voce marcou como assistido',
      );
    }
  }

  async setCover(
    userId: number,
    cover: { type: FavoriteType; idTmdb: number } | null,
  ): Promise<CoverDto | null> {
    if (!cover) {
      await this.userRepository.update(userId, {
        coverType: null,
        coverTmdbId: null,
      });
      return null;
    }

    await this.assertWatched(userId, cover.type, cover.idTmdb);

    await this.userRepository.update(userId, {
      coverType: cover.type,
      coverTmdbId: cover.idTmdb,
    });

    return this.resolveCover(cover.type, cover.idTmdb);
  }

  private async resolveCounts(userId: number): Promise<ProfileCountsDto> {
    const [followers, following, movies, seasons] = await Promise.all([
      this.followRepository.count({ where: { following: { id: userId } } }),
      this.followRepository.count({ where: { follower: { id: userId } } }),
      this.watchedMovieRepository.count({ where: { idUser: { id: userId } } }),
      this.watchedSeasonRepository.find({
        where: { user: { id: userId } },
        select: { idTmdb: true, episodeCount: true, runtimeMinutes: true },
      }),
    ]);

    return {
      followers,
      following,
      movies,
      episodes: seasons.reduce(
        (total, season) => total + (season.episodeCount ?? 0),
        0,
      ),
    };
  }

  async getProfile(viewerId: number, username: string): Promise<ProfileDto> {
    const owner = await this.userRepository.findOne({
      where: { username: ILike(username) },
      select: [
        'id',
        'username',
        'name',
        'bio',
        'createdAt',
        'coverType',
        'coverTmdbId',
      ],
    });

    if (!owner) {
      throw new NotFoundException('Perfil nao encontrado');
    }

    const isSelf = owner.id === viewerId;

    const [counts, favorites, cover, avatarStamps, followingRow, followsYouRow] =
      await Promise.all([
        this.resolveCounts(owner.id),
        this.resolveFavorites(owner.id),
        this.resolveCover(owner.coverType, owner.coverTmdbId),
        this.avatarStampsFor([owner.id]),
        isSelf
          ? Promise.resolve(null)
          : this.followRepository.findOne({
              where: {
                follower: { id: viewerId },
                following: { id: owner.id },
              },
              select: ['id'],
            }),
        isSelf
          ? Promise.resolve(null)
          : this.followRepository.findOne({
              where: {
                follower: { id: owner.id },
                following: { id: viewerId },
              },
              select: ['id'],
            }),
      ]);

    return {
      id: owner.id,
      username: owner.username,
      name: owner.name,
      bio: owner.bio ?? null,
      isSelf,
      isFollowing: Boolean(followingRow),
      followsYou: Boolean(followsYouRow),
      counts,
      favorites,
      cover,
      joinedAt: this.isoOf(owner.createdAt),
      avatarUpdatedAt: avatarStamps.get(owner.id) ?? null,
    };
  }

  private async findUserByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { username: ILike(username) },
      select: ['id', 'username'],
    });

    if (!user) {
      throw new NotFoundException('Perfil nao encontrado');
    }

    return user;
  }

  async followUser(viewerId: number, username: string): Promise<void> {
    const target = await this.findUserByUsername(username);

    if (target.id === viewerId) {
      throw new BadRequestException('Nao e possivel seguir a si mesmo');
    }

    const existing = await this.followRepository.findOne({
      where: { follower: { id: viewerId }, following: { id: target.id } },
      select: ['id'],
    });

    if (existing) return;

    try {
      await this.followRepository.insert({
        follower: { id: viewerId },
        following: { id: target.id },
      });
    } catch (caught) {
      if ((caught as { code?: string }).code !== UNIQUE_VIOLATION) {
        throw caught;
      }
    }
  }

  async unfollowUser(viewerId: number, username: string): Promise<void> {
    const target = await this.findUserByUsername(username);

    await this.followRepository.delete({
      follower: { id: viewerId },
      following: { id: target.id },
    });
  }

  private resolvePageSize(limit?: number): number {
    if (!Number.isInteger(limit) || !limit || limit < 1) {
      return DEFAULT_PAGE_SIZE;
    }
    return Math.min(limit, MAX_PAGE_SIZE);
  }

  private async listRelations(
    viewerId: number,
    username: string,
    direction: 'followers' | 'following',
    cursor?: string,
    limit?: number,
  ): Promise<UserListDto> {
    const owner = await this.findUserByUsername(username);
    const pageSize = this.resolvePageSize(limit);
    const parsed = decodeCursor(cursor);

    const anchor =
      direction === 'followers'
        ? { following: { id: owner.id } }
        : { follower: { id: owner.id } };

    const rows = await this.followRepository.find({
      where: parsed
        ? [
            { ...anchor, createdAt: LessThan(new Date(parsed.occurredAt)) },
            {
              ...anchor,
              createdAt: Equal(new Date(parsed.occurredAt)),
              id: LessThan(parsed.id),
            },
          ]
        : anchor,
      relations:
        direction === 'followers' ? { follower: true } : { following: true },
      select:
        direction === 'followers'
          ? {
              id: true,
              createdAt: true,
              follower: { id: true, username: true, name: true },
            }
          : {
              id: true,
              createdAt: true,
              following: { id: true, username: true, name: true },
            },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: pageSize + 1,
    });

    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;

    const stamps = await this.avatarStampsFor(
      page.map(row =>
        direction === 'followers' ? row.follower.id : row.following.id,
      ),
    );

    const users = await Promise.all(
      page.map(async row => {
        const person = direction === 'followers' ? row.follower : row.following;
        const isSelf = person.id === viewerId;
        const relation = isSelf
          ? null
          : await this.followRepository.findOne({
              where: {
                follower: { id: viewerId },
                following: { id: person.id },
              },
              select: ['id'],
            });

        return {
          username: person.username,
          name: person.name,
          isSelf,
          isFollowing: Boolean(relation),
          avatarUpdatedAt: stamps.get(person.id) ?? null,
        };
      }),
    );

    const last = page[page.length - 1];

    return {
      users,
      nextCursor:
        hasMore && last
          ? encodeCursor({
              occurredAt: new Date(last.createdAt).toISOString(),
              rank: 0,
              id: last.id,
            })
          : null,
    };
  }

  async listFollowers(
    viewerId: number,
    username: string,
    cursor?: string,
    limit?: number,
  ): Promise<UserListDto> {
    return this.listRelations(viewerId, username, 'followers', cursor, limit);
  }

  async listFollowing(
    viewerId: number,
    username: string,
    cursor?: string,
    limit?: number,
  ): Promise<UserListDto> {
    return this.listRelations(viewerId, username, 'following', cursor, limit);
  }

  async searchMembers(
    viewerId: number,
    query: string,
    cursor?: string,
    limit?: number,
  ): Promise<UserListDto> {
    const term = normalizeForMatch(query ?? '');
    if (term.length === 0) return { users: [], nextCursor: null };

    const pageSize = this.resolvePageSize(limit);
    const offset = decodeOffsetCursor(cursor) ?? 0;

    const [rows, total] = await this.userRepository
      .createQueryBuilder('user')
      .where('user.searchName LIKE :pattern', {
        pattern: `%${term}%`,
        term,
        exact: term,
        prefix: `${term}%`,
      })
      .andWhere('user.id <> :viewerId', { viewerId })
      .orderBy(
        `CASE
           WHEN user.searchName = :exact THEN 1
           WHEN user.searchName LIKE :prefix THEN 2
           ELSE 3
         END`,
        'ASC',
      )
      .addOrderBy('user.username', 'ASC')
      .skip(offset)
      .take(pageSize)
      .getManyAndCount();

    const stamps = await this.avatarStampsFor(rows.map(row => row.id));

    const users = await Promise.all(
      rows.map(async person => {
        const relation = await this.followRepository.findOne({
          where: { follower: { id: viewerId }, following: { id: person.id } },
          select: ['id'],
        });

        return {
          username: person.username,
          name: person.name,
          isSelf: false,
          isFollowing: Boolean(relation),
          avatarUpdatedAt: stamps.get(person.id) ?? null,
        };
      }),
    );

    const consumed = offset + rows.length;

    return {
      users,
      nextCursor: consumed < total ? encodeOffsetCursor(consumed) : null,
    };
  }

  async updateBio(
    userId: number,
    bio: string | null,
  ): Promise<{ bio: string | null }> {
    const trimmed = typeof bio === 'string' ? bio.trim() : null;
    const value = trimmed && trimmed.length > 0 ? trimmed : null;

    await this.userRepository.update(userId, { bio: value });

    return { bio: value };
  }

  private async assertUsernameFree(
    userId: number,
    username: string,
  ): Promise<void> {
    const taken = await this.userRepository.findOne({
      where: { username: ILike(username) },
      select: ['id'],
    });

    if (taken && taken.id !== userId) {
      throw new ConflictException('Esse nome de usuario ja esta em uso');
    }
  }

  async updateProfile(
    userId: number,
    changes: { bio?: string | null; name?: string; username?: string },
  ): Promise<{ bio?: string | null; name?: string; username?: string }> {
    const patch: { bio?: string | null; name?: string; username?: string } = {};

    if ('bio' in changes) {
      const trimmed =
        typeof changes.bio === 'string' ? changes.bio.trim() : null;
      patch.bio = trimmed && trimmed.length > 0 ? trimmed : null;
    }

    if (changes.name !== undefined) {
      const name = changes.name.trim();
      if (name.length === 0) {
        throw new BadRequestException('O nome nao pode ficar vazio');
      }
      patch.name = name;
    }

    if (changes.username !== undefined) {
      const username = changes.username.trim();
      if (username.length === 0) {
        throw new BadRequestException('O nome de usuario nao pode ficar vazio');
      }
      await this.assertUsernameFree(userId, username);
      patch.username = username;
    }

    if (Object.keys(patch).length === 0) return {};

    const columns: typeof patch & { searchName?: string } = { ...patch };

    if (patch.name !== undefined || patch.username !== undefined) {
      const owner = await this.userRepository.findOne({
        where: { id: userId },
        select: ['name', 'username'],
      });

      columns.searchName = buildSearchName(
        patch.name ?? owner?.name,
        patch.username ?? owner?.username,
      );
    }

    try {
      await this.userRepository.update(userId, columns);
    } catch (caught) {
      if ((caught as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException('Esse nome de usuario ja esta em uso');
      }
      throw caught;
    }

    return patch;
  }

  async setFavorites(
    userId: number,
    favorites: { type: FavoriteType; idTmdb: number }[],
  ): Promise<FavoriteDto[]> {
    const keys = favorites.map(item => `${item.type}:${item.idTmdb}`);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Nao repita o mesmo titulo nos favoritos');
    }

    const perType = favorites.reduce<Record<string, number>>(
      (accumulator, item) => ({
        ...accumulator,
        [item.type]: (accumulator[item.type] ?? 0) + 1,
      }),
      {},
    );

    if (Object.values(perType).some(total => total > 3)) {
      throw new BadRequestException(
        'Escolha no maximo tres filmes e tres series',
      );
    }

    if (favorites.length > 0) {
      const [watchedMovies, watchedSeries] = await Promise.all([
        this.watchedMovieRepository.find({
          where: { idUser: { id: userId } },
          select: { idTmdb: true },
        }),
        this.watchedSerieRepository.find({
          where: { user: { id: userId } },
          select: { idTmdb: true },
        }),
      ]);

      const owned = new Set([
        ...watchedMovies.map(row => `movie:${row.idTmdb}`),
        ...watchedSeries.map(row => `serie:${row.idTmdb}`),
      ]);

      const missing = keys.find(key => !owned.has(key));
      if (missing) {
        throw new BadRequestException(
          'Só é possível favoritar títulos que você marcou como assistidos',
        );
      }
    }

    await this.favoriteRepository.manager.transaction(async manager => {
      await manager.delete(FavoriteTitle, { user: { id: userId } });

      if (favorites.length === 0) return;

      const ordered = [
        ...favorites.filter(item => item.type === 'movie'),
        ...favorites.filter(item => item.type === 'serie'),
      ];

      const counters: Record<string, number> = {};

      await manager.insert(
        FavoriteTitle,
        ordered.map(item => {
          counters[item.type] = (counters[item.type] ?? 0) + 1;
          return {
            user: { id: userId },
            type: item.type,
            idTmdb: item.idTmdb,
            position: counters[item.type],
          };
        }),
      );
    });

    return this.resolveFavorites(userId);
  }
}
