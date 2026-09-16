import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import {
  WatchTogether,
  WatchTogetherType,
} from '../users/entities/watch-together.entity';
import { User } from '../users/entities/user.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';
import { UserAvatar } from '../users/entities/user-avatar.entity';
import { UserSummaryDto } from './dto/profile.dto';

const UNIQUE_VIOLATION = '23505';

export interface TagInput {
  type: WatchTogetherType;
  idTmdb: number;
  seasonNumber?: number | null;
  companionUsername: string;
}

export const titleKey = (
  type: string,
  idTmdb: number,
  seasonNumber: number | null | undefined,
): string => `${type}:${idTmdb}:${seasonNumber ?? ''}`;

@Injectable()
export class WatchTogetherService {
  constructor(
    @InjectRepository(WatchTogether)
    private readonly linkRepository: Repository<WatchTogether>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WatchedMovie)
    private readonly watchedMovieRepository: Repository<WatchedMovie>,
    @InjectRepository(WatchedSeason)
    private readonly watchedSeasonRepository: Repository<WatchedSeason>,
    @InjectRepository(Movies)
    private readonly movieRepository: Repository<Movies>,
    @InjectRepository(Series)
    private readonly serieRepository: Repository<Series>,
    @InjectRepository(UserAvatar)
    private readonly avatarRepository: Repository<UserAvatar>,
  ) {}

  async titlesFor(
    rows: { type: string; idTmdb: number }[],
  ): Promise<Map<string, { title: string; posterPath: string | null }>> {
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

    const map = new Map<string, { title: string; posterPath: string | null }>();

    movies.forEach(movie =>
      map.set(`movie:${movie.idTmdb}`, {
        title: movie.title,
        posterPath: movie.posterPath ?? null,
      }),
    );
    series.forEach(serie =>
      map.set(`serie:${serie.idTmdb}`, {
        title: serie.name,
        posterPath: serie.posterPath ?? null,
      }),
    );

    return map;
  }

  private async findOwnWatch(
    userId: number,
    type: WatchTogetherType,
    idTmdb: number,
    seasonNumber: number | null | undefined,
  ) {
    if (type === 'movie') {
      return this.watchedMovieRepository.findOne({
        where: { idUser: { id: userId }, idTmdb },
      });
    }

    return this.watchedSeasonRepository.findOne({
      where: {
        user: { id: userId },
        idTmdb,
        seasonNumber: seasonNumber ?? 0,
      },
    });
  }

  private async findLink(id: number): Promise<WatchTogether> {
    const link = await this.linkRepository.findOne({ where: { id } });
    if (!link) throw new NotFoundException('Marcacao nao encontrada');
    return link;
  }

  async tag(userId: number, input: TagInput): Promise<void> {
    const companion = await this.userRepository.findOne({
      where: { username: ILike(input.companionUsername) },
      select: ['id', 'username'],
    });

    if (!companion) throw new NotFoundException('Perfil nao encontrado');

    if (companion.id === userId) {
      throw new BadRequestException('Nao e possivel marcar a si mesmo');
    }

    const own = await this.findOwnWatch(
      userId,
      input.type,
      input.idTmdb,
      input.seasonNumber,
    );

    if (!own) {
      throw new BadRequestException(
        'Marque o titulo como assistido antes de dizer com quem assistiu',
      );
    }

    const existing = await this.linkRepository.findOne({
      where: [
        {
          type: input.type,
          idTmdb: input.idTmdb,
          seasonNumber: input.seasonNumber ?? null,
          requesterId: userId,
          companionId: companion.id,
        },
        {
          type: input.type,
          idTmdb: input.idTmdb,
          seasonNumber: input.seasonNumber ?? null,
          requesterId: companion.id,
          companionId: userId,
        },
      ],
    });

    if (existing) return;

    const watchedAt = own.watchedAt ?? null;
    const episodeCount =
      input.type === 'serie' ? ((own as WatchedSeason).episodeCount ?? null) : null;

    try {
      await this.linkRepository.insert({
        type: input.type,
        idTmdb: input.idTmdb,
        seasonNumber: input.seasonNumber ?? null,
        requesterId: userId,
        companionId: companion.id,
        status: 'pending',
        watchedAt: watchedAt ? String(watchedAt) : null,
        episodeCount,
      });
    } catch (caught) {
      if ((caught as { code?: string }).code !== UNIQUE_VIOLATION) throw caught;
    }
  }

  async listPending(userId: number): Promise<WatchTogether[]> {
    return this.linkRepository.find({
      where: { companionId: userId, status: 'pending' },
      relations: { requester: true },
      order: { createdAt: 'DESC' },
    });
  }

  async accept(userId: number, id: number, rating?: number): Promise<void> {
    const link = await this.findLink(id);

    if (link.companionId !== userId) {
      throw new ForbiddenException('Essa marcacao nao e sua para responder');
    }

    const existing = await this.findOwnWatch(
      userId,
      link.type,
      link.idTmdb,
      link.seasonNumber,
    );

    if (!existing) {
      if (link.type === 'movie') {
        try {
          await this.watchedMovieRepository.insert({
            idUser: { id: userId },
            idTmdb: link.idTmdb,
            watchedAt: link.watchedAt as unknown as Date,
            rating: rating ?? null,
          });
        } catch (caught) {
          if ((caught as { code?: string }).code !== UNIQUE_VIOLATION) {
            throw caught;
          }
        }
      } else {
        try {
          await this.watchedSeasonRepository.insert({
            user: { id: userId },
            idTmdb: link.idTmdb,
            seasonNumber: link.seasonNumber ?? 0,
            episodeCount: link.episodeCount ?? 0,
            watchedAt: link.watchedAt as unknown as Date,
          });
        } catch (caught) {
          if ((caught as { code?: string }).code !== UNIQUE_VIOLATION) {
            throw caught;
          }
        }
      }
    } else if (rating !== undefined && link.type === 'movie') {
      await this.watchedMovieRepository.update(existing.id, { rating });
    }

    await this.linkRepository.update(id, {
      status: 'accepted',
      respondedAt: new Date(),
    });
  }

  async reject(userId: number, id: number): Promise<void> {
    const link = await this.findLink(id);

    if (link.companionId !== userId) {
      throw new ForbiddenException('Essa marcacao nao e sua para responder');
    }

    await this.linkRepository.update(id, {
      status: 'rejected',
      respondedAt: new Date(),
    });
  }

  async remove(userId: number, id: number): Promise<void> {
    const link = await this.findLink(id);

    if (link.requesterId !== userId) {
      throw new ForbiddenException('Apenas quem marcou pode desfazer');
    }

    await this.linkRepository.delete(id);
  }

  async companionsFor(
    userId: number,
  ): Promise<Map<string, UserSummaryDto[]>> {
    const rows = await this.linkRepository.find({
      where: [
        { requesterId: userId, status: 'accepted' },
        { companionId: userId, status: 'accepted' },
      ],
      relations: { requester: true, companion: true },
    });

    const otherIds = Array.from(
      new Set(
        rows.map(row =>
          row.requesterId === userId ? row.companionId : row.requesterId,
        ),
      ),
    );

    const stamps = new Map<number, string>();

    if (otherIds.length > 0) {
      const avatars = await this.avatarRepository.find({
        where: { userId: In(otherIds) },
        select: { userId: true, updatedAt: true },
      });
      avatars.forEach(avatar =>
        stamps.set(avatar.userId, new Date(avatar.updatedAt).toISOString()),
      );
    }

    const map = new Map<string, UserSummaryDto[]>();

    rows.forEach(row => {
      const other =
        row.requesterId === userId ? row.companion : row.requester;
      if (!other) return;

      const key = titleKey(row.type, row.idTmdb, row.seasonNumber);
      const current = map.get(key) ?? [];

      current.push({
        username: other.username,
        name: other.name,
        isSelf: false,
        isFollowing: false,
        avatarUpdatedAt:
          stamps.get(
            row.requesterId === userId ? row.companionId : row.requesterId,
          ) ?? null,
      });

      map.set(key, current);
    });

    return map;
  }
}
