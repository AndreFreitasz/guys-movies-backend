import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { ProfileService } from './profile.service';
import { encodeCursor } from './cursor';
import { User } from '../users/entities/user.entity';
import { Follow } from '../users/entities/follow.entity';
import { FavoriteTitle } from '../users/entities/favorite-title.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';
import { UserAvatar } from '../users/entities/user-avatar.entity';

describe('ProfileService', () => {
  let service: ProfileService;
  let userRepository: { findOne: jest.Mock; update: jest.Mock };
  let followRepository: {
    count: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
  };
  let favoriteRepository: {
    find: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let watchedMovieRepository: { count: jest.Mock; find: jest.Mock };
  let watchedSerieRepository: { count: jest.Mock; find: jest.Mock };
  let watchedSeasonRepository: { find: jest.Mock };
  let movieRepository: { find: jest.Mock };
  let serieRepository: { find: jest.Mock };
  let avatarRepository: { find: jest.Mock };

  beforeEach(async () => {
    userRepository = { findOne: jest.fn(), update: jest.fn() };
    followRepository = {
      count: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
    };
    favoriteRepository = {
      find: jest.fn(),
      manager: { transaction: jest.fn() },
    };
    watchedMovieRepository = { count: jest.fn(), find: jest.fn() };
    watchedSerieRepository = { count: jest.fn(), find: jest.fn() };
    watchedSeasonRepository = { find: jest.fn() };
    movieRepository = { find: jest.fn() };
    serieRepository = { find: jest.fn() };
    avatarRepository = { find: jest.fn().mockResolvedValue([]) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(Follow), useValue: followRepository },
        {
          provide: getRepositoryToken(FavoriteTitle),
          useValue: favoriteRepository,
        },
        {
          provide: getRepositoryToken(WatchedMovie),
          useValue: watchedMovieRepository,
        },
        {
          provide: getRepositoryToken(WatchedSerie),
          useValue: watchedSerieRepository,
        },
        {
          provide: getRepositoryToken(WatchedSeason),
          useValue: watchedSeasonRepository,
        },
        { provide: getRepositoryToken(Movies), useValue: movieRepository },
        { provide: getRepositoryToken(Series), useValue: serieRepository },
        {
          provide: getRepositoryToken(UserAvatar),
          useValue: avatarRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(ProfileService);
  });

  describe('getStats', () => {
    it('soma episodios das temporadas e devolve o retrato completo', async () => {
      watchedMovieRepository.count.mockResolvedValue(42);
      watchedSerieRepository.count.mockResolvedValue(7);
      watchedSeasonRepository.find.mockResolvedValue([
        { episodeCount: 10, idTmdb: 1 },
        { episodeCount: 8, idTmdb: 1 },
        { episodeCount: 6, idTmdb: 2 },
      ]);
      serieRepository.find.mockResolvedValue([
        { idTmdb: 1, episodeRunTime: 50 },
        { idTmdb: 2, episodeRunTime: 25 },
      ]);

      const stats = await service.getStats(7);

      expect(stats).toEqual({
        movies: 42,
        series: 7,
        episodes: 24,
        serieRuntimeMinutes: 1050,
      });
    });

    it('devolve zero em vez de NaN quando nao ha nada assistido', async () => {
      watchedMovieRepository.count.mockResolvedValue(0);
      watchedSerieRepository.count.mockResolvedValue(0);
      watchedSeasonRepository.find.mockResolvedValue([]);
      serieRepository.find.mockResolvedValue([]);

      expect(await service.getStats(7)).toEqual({
        movies: 0,
        series: 0,
        episodes: 0,
        serieRuntimeMinutes: 0,
      });
    });

    it('ignora temporada cuja serie nao tem duracao conhecida', async () => {
      watchedMovieRepository.count.mockResolvedValue(0);
      watchedSerieRepository.count.mockResolvedValue(1);
      watchedSeasonRepository.find.mockResolvedValue([
        { episodeCount: 10, idTmdb: 1 },
      ]);
      serieRepository.find.mockResolvedValue([
        { idTmdb: 1, episodeRunTime: null },
      ]);

      const stats = await service.getStats(7);

      expect(stats.episodes).toBe(10);
      expect(stats.serieRuntimeMinutes).toBe(0);
    });

    it('escopa toda leitura ao usuario pedido', async () => {
      watchedMovieRepository.count.mockResolvedValue(0);
      watchedSerieRepository.count.mockResolvedValue(0);
      watchedSeasonRepository.find.mockResolvedValue([]);
      serieRepository.find.mockResolvedValue([]);

      await service.getStats(7);

      expect(watchedMovieRepository.count).toHaveBeenCalledWith({
        where: { idUser: { id: 7 } },
      });
      expect(watchedSerieRepository.count).toHaveBeenCalledWith({
        where: { user: { id: 7 } },
      });
      expect(watchedSeasonRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 7 } },
        select: { idTmdb: true, episodeCount: true },
      });
    });
  });

  describe('getProfile', () => {
    const owner = {
      id: 9,
      username: 'andre',
      name: 'André',
      bio: 'Só filme bom',
      email: 'nao-pode-vazar@exemplo.com',
    };

    const stubCounts = () => {
      watchedMovieRepository.count.mockResolvedValue(3);
      watchedSeasonRepository.find.mockResolvedValue([{ episodeCount: 5 }]);
      followRepository.count.mockResolvedValue(0);
      favoriteRepository.find.mockResolvedValue([]);
      followRepository.findOne.mockResolvedValue(null);
    };

    it('nunca inclui email no payload', async () => {
      userRepository.findOne.mockResolvedValue(owner);
      stubCounts();

      const profile = await service.getProfile(1, 'andre');

      expect(JSON.stringify(profile)).not.toContain('nao-pode-vazar');
      expect(profile).not.toHaveProperty('email');
    });

    it('acha o usuario sem diferenciar maiuscula de minuscula', async () => {
      userRepository.findOne.mockResolvedValue(owner);
      stubCounts();

      await service.getProfile(1, 'ANDRE');

      const where = userRepository.findOne.mock.calls[0][0].where;
      expect(where.username).toBeInstanceOf(FindOperator);
      expect(where.username.type).toBe('ilike');
      expect(where.username.value).toBe('ANDRE');
    });

    it('estoura 404 quando o username nao existe', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile(1, 'fantasma')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('marca isSelf e nao consulta relacao quando e o proprio perfil', async () => {
      userRepository.findOne.mockResolvedValue(owner);
      stubCounts();

      const profile = await service.getProfile(9, 'andre');

      expect(profile.isSelf).toBe(true);
      expect(profile.isFollowing).toBe(false);
      expect(profile.followsYou).toBe(false);
      expect(followRepository.findOne).not.toHaveBeenCalled();
    });

    it('traz as duas direcoes da relacao no mesmo payload', async () => {
      userRepository.findOne.mockResolvedValue(owner);
      stubCounts();
      followRepository.findOne
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);

      const profile = await service.getProfile(1, 'andre');

      expect(profile.isFollowing).toBe(true);
      expect(profile.followsYou).toBe(false);
    });

it('resolve a capa e a data de entrada', async () => {
      userRepository.findOne.mockResolvedValue({
        ...owner,
        createdAt: new Date('2024-03-08T12:00:00.000Z'),
        coverType: 'movie',
        coverTmdbId: 603,
      });
      watchedMovieRepository.count.mockResolvedValue(0);
      watchedSeasonRepository.find.mockResolvedValue([]);
      followRepository.count.mockResolvedValue(0);
      followRepository.findOne.mockResolvedValue(null);
      favoriteRepository.find.mockResolvedValue([]);
      movieRepository.find.mockResolvedValue([
        { idTmdb: 603, title: 'Matrix', backdropPath: '/bd.jpg' },
      ]);

      const profile = await service.getProfile(1, 'andre');

      expect(profile.cover).toEqual({
        type: 'movie',
        idTmdb: 603,
        title: 'Matrix',
        backdropPath: '/bd.jpg',
      });
      expect(profile.joinedAt).toBe('2024-03-08T12:00:00.000Z');
    });

    it('devolve capa nula quando o usuario nao escolheu nenhuma', async () => {
      userRepository.findOne.mockResolvedValue(owner);
      stubCounts();

      const profile = await service.getProfile(9, 'andre');

      expect(profile.cover).toBeNull();
    });

    it('resolve titulo e ano dos favoritos e preserva a ordem', async () => {
      userRepository.findOne.mockResolvedValue(owner);
      watchedMovieRepository.count.mockResolvedValue(0);
      watchedSeasonRepository.find.mockResolvedValue([]);
      followRepository.count.mockResolvedValue(0);
      followRepository.findOne.mockResolvedValue(null);
      favoriteRepository.find.mockResolvedValue([
        { type: 'serie', idTmdb: 1396, position: 1 },
        { type: 'movie', idTmdb: 603, position: 2 },
      ]);
      movieRepository.find.mockResolvedValue([
        {
          idTmdb: 603,
          title: 'Matrix',
          posterPath: 'https://cdn/m.jpg',
          releaseDate: '1999-03-31',
        },
      ]);
      serieRepository.find.mockResolvedValue([
        {
          idTmdb: 1396,
          name: 'Breaking Bad',
          posterPath: null,
          firstAirDate: '2008-01-20',
        },
      ]);

      const profile = await service.getProfile(1, 'andre');

      expect(profile.favorites).toEqual([
        {
          type: 'serie',
          idTmdb: 1396,
          title: 'Breaking Bad',
          posterPath: null,
          year: 2008,
          position: 1,
        },
        {
          type: 'movie',
          idTmdb: 603,
          title: 'Matrix',
          posterPath: 'https://cdn/m.jpg',
          year: 1999,
          position: 2,
        },
      ]);
    });

    it('omite favorito cujo titulo sumiu da tabela local', async () => {
      userRepository.findOne.mockResolvedValue(owner);
      watchedMovieRepository.count.mockResolvedValue(0);
      watchedSeasonRepository.find.mockResolvedValue([]);
      followRepository.count.mockResolvedValue(0);
      followRepository.findOne.mockResolvedValue(null);
      favoriteRepository.find.mockResolvedValue([
        { type: 'movie', idTmdb: 999, position: 1 },
      ]);
      movieRepository.find.mockResolvedValue([]);
      serieRepository.find.mockResolvedValue([]);

      const profile = await service.getProfile(1, 'andre');

      expect(profile.favorites).toEqual([]);
    });
  });

  describe('followUser', () => {
    it('cria o vinculo quando ainda nao existe', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.findOne.mockResolvedValue(null);
      followRepository.insert.mockResolvedValue({});

      await service.followUser(1, 'andre');

      expect(followRepository.insert).toHaveBeenCalledWith({
        follower: { id: 1 },
        following: { id: 9 },
      });
    });

    it('e idempotente: seguir de novo nao cria segunda linha', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.findOne.mockResolvedValue({ id: 5 });

      await service.followUser(1, 'andre');

      expect(followRepository.insert).not.toHaveBeenCalled();
    });

    it('sobrevive a corrida perdida sem estourar para o cliente', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.findOne.mockResolvedValue(null);
      followRepository.insert.mockRejectedValue({ code: '23505' });

      await expect(service.followUser(1, 'andre')).resolves.toBeUndefined();
    });

    it('rejeita seguir a si mesmo', async () => {
      userRepository.findOne.mockResolvedValue({ id: 1, username: 'andre' });

      await expect(service.followUser(1, 'andre')).rejects.toThrow(
        BadRequestException,
      );
      expect(followRepository.insert).not.toHaveBeenCalled();
    });

    it('estoura 404 para username inexistente', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.followUser(1, 'fantasma')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unfollowUser', () => {
    it('remove o vinculo escopado nas duas pontas', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.delete.mockResolvedValue({ affected: 1 });

      await service.unfollowUser(1, 'andre');

      expect(followRepository.delete).toHaveBeenCalledWith({
        follower: { id: 1 },
        following: { id: 9 },
      });
    });

    it('e idempotente: remover o que nao existe nao estoura', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.unfollowUser(1, 'andre')).resolves.toBeUndefined();
    });
  });

  describe('listFollowers', () => {
    const followRow = (id: number, username: string) => ({
      id,
      createdAt: new Date('2026-03-10T10:00:00Z'),
      follower: { id: id * 10, username, name: username.toUpperCase() },
    });

    it('devolve nextCursor quando ha mais que o limite', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.find.mockResolvedValue([
        followRow(3, 'ana'),
        followRow(2, 'bruno'),
        followRow(1, 'caio'),
      ]);
      followRepository.findOne.mockResolvedValue(null);

      const result = await service.listFollowers(1, 'andre', undefined, 2);

      expect(result.users).toHaveLength(2);
      expect(result.nextCursor).not.toBeNull();
    });

    it('devolve nextCursor nulo na ultima pagina', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.find.mockResolvedValue([followRow(3, 'ana')]);
      followRepository.findOne.mockResolvedValue(null);

      const result = await service.listFollowers(1, 'andre', undefined, 2);

      expect(result.users).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('marca isFollowing em relacao a quem pede, nao ao dono do perfil', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.find.mockResolvedValue([
        followRow(3, 'ana'),
        followRow(2, 'bruno'),
      ]);
      followRepository.findOne.mockImplementation(({ where }) =>
        Promise.resolve(where.following.id === 30 ? { id: 77 } : null),
      );

      const result = await service.listFollowers(1, 'andre', undefined, 10);

      expect(result.users[0]).toEqual({
        username: 'ana',
        name: 'ANA',
        avatarUpdatedAt: null,
        isSelf: false,
        isFollowing: true,
      });
      expect(result.users[1].isFollowing).toBe(false);
    });

    it('marca isSelf para o proprio usuario dentro da lista', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.find.mockResolvedValue([followRow(3, 'ana')]);
      followRepository.findOne.mockResolvedValue(null);

      const result = await service.listFollowers(30, 'andre', undefined, 10);

      expect(result.users[0].isSelf).toBe(true);
    });

    it('limita o limit pedido ao teto', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.find.mockResolvedValue([]);

      await service.listFollowers(1, 'andre', undefined, 5000);

      expect(followRepository.find.mock.calls[0][0].take).toBe(51);
    });

    it('pagina usando o keyset cursor quando fornecido', async () => {
      userRepository.findOne.mockResolvedValue({ id: 9, username: 'andre' });
      followRepository.find.mockResolvedValue([followRow(2, 'bruno')]);
      followRepository.findOne.mockResolvedValue(null);

      const cursor = encodeCursor({
        occurredAt: '2026-03-10T10:00:00.000Z',
        rank: 0,
        id: 3,
      });

      await service.listFollowers(1, 'andre', cursor, 10);

      const whereClause = followRepository.find.mock.calls[0][0].where;
      expect(Array.isArray(whereClause)).toBe(true);
      expect(whereClause).toHaveLength(2);

      const [firstBranch, secondBranch] = whereClause;
      const expectedDate = new Date('2026-03-10T10:00:00.000Z');

      expect(firstBranch.following).toEqual({ id: 9 });
      expect(firstBranch.createdAt.type).toBe('lessThan');
      expect(firstBranch.createdAt.value).toEqual(expectedDate);

      expect(secondBranch.following).toEqual({ id: 9 });
      expect(secondBranch.createdAt.type).toBe('equal');
      expect(secondBranch.createdAt.value).toEqual(expectedDate);
      expect(secondBranch.id.type).toBe('lessThan');
      expect(secondBranch.id.value).toBe(3);
    });
  });

  describe('setFavorites', () => {
    const runTransaction = () => {
      favoriteRepository.manager.transaction.mockImplementation(
        async (callback: (manager: unknown) => Promise<unknown>) =>
          callback({ delete: jest.fn(), insert: jest.fn(), save: jest.fn() }),
      );
    };

    it('rejeita titulo que nao esta na biblioteca de assistidos', async () => {
      watchedMovieRepository.find.mockResolvedValue([]);
      watchedSerieRepository.find.mockResolvedValue([]);

      await expect(
        service.setFavorites(7, [{ type: 'movie', idTmdb: 603 }]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita duplicata dentro da propria lista', async () => {
      watchedMovieRepository.find.mockResolvedValue([{ idTmdb: 603 }]);
      watchedSerieRepository.find.mockResolvedValue([]);

      await expect(
        service.setFavorites(7, [
          { type: 'movie', idTmdb: 603 },
          { type: 'movie', idTmdb: 603 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('aceita mesmo idTmdb em tipos diferentes', async () => {
      watchedMovieRepository.find.mockResolvedValue([{ idTmdb: 603 }]);
      watchedSerieRepository.find.mockResolvedValue([{ idTmdb: 603 }]);
      runTransaction();
      favoriteRepository.find.mockResolvedValue([]);
      movieRepository.find.mockResolvedValue([]);
      serieRepository.find.mockResolvedValue([]);

      await expect(
        service.setFavorites(7, [
          { type: 'movie', idTmdb: 603 },
          { type: 'serie', idTmdb: 603 },
        ]),
      ).resolves.toEqual([]);
    });

    it('apaga e reinsere dentro de uma transacao, com posicao 1..n', async () => {
      watchedMovieRepository.find.mockResolvedValue([
        { idTmdb: 603 },
        { idTmdb: 550 },
      ]);
      watchedSerieRepository.find.mockResolvedValue([]);

      const manager = { delete: jest.fn(), insert: jest.fn() };
      favoriteRepository.manager.transaction.mockImplementation(
        async (callback: (m: unknown) => Promise<unknown>) => callback(manager),
      );
      favoriteRepository.find.mockResolvedValue([]);
      movieRepository.find.mockResolvedValue([]);
      serieRepository.find.mockResolvedValue([]);

      await service.setFavorites(7, [
        { type: 'movie', idTmdb: 550 },
        { type: 'movie', idTmdb: 603 },
      ]);

      expect(manager.delete).toHaveBeenCalledWith(FavoriteTitle, {
        user: { id: 7 },
      });
      expect(manager.insert).toHaveBeenCalledWith(FavoriteTitle, [
        { user: { id: 7 }, type: 'movie', idTmdb: 550, position: 1 },
        { user: { id: 7 }, type: 'movie', idTmdb: 603, position: 2 },
      ]);
    });

    it('lista vazia limpa os favoritos sem inserir nada', async () => {
      const manager = { delete: jest.fn(), insert: jest.fn() };
      favoriteRepository.manager.transaction.mockImplementation(
        async (callback: (m: unknown) => Promise<unknown>) => callback(manager),
      );
      favoriteRepository.find.mockResolvedValue([]);
      movieRepository.find.mockResolvedValue([]);
      serieRepository.find.mockResolvedValue([]);

      await service.setFavorites(7, []);

      expect(manager.delete).toHaveBeenCalled();
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('consulta a biblioteca escopada no usuario da sessao', async () => {
      watchedMovieRepository.find.mockResolvedValue([{ idTmdb: 603 }]);
      watchedSerieRepository.find.mockResolvedValue([]);
      runTransaction();
      favoriteRepository.find.mockResolvedValue([]);
      movieRepository.find.mockResolvedValue([]);
      serieRepository.find.mockResolvedValue([]);

      await service.setFavorites(7, [{ type: 'movie', idTmdb: 603 }]);

      expect(watchedMovieRepository.find).toHaveBeenCalledWith({
        where: { idUser: { id: 7 } },
        select: { idTmdb: true },
      });
    });
  });

  describe('updateBio', () => {
    it('salva a bio e devolve o valor gravado', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateBio(7, '  Só filme bom  ');

      expect(userRepository.update).toHaveBeenCalledWith(7, {
        bio: 'Só filme bom',
      });
      expect(result).toEqual({ bio: 'Só filme bom' });
    });

    it('grava null quando a bio vira string vazia', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateBio(7, '   ');

      expect(userRepository.update).toHaveBeenCalledWith(7, { bio: null });
      expect(result).toEqual({ bio: null });
    });
  });

  describe('setFavorites', () => {
    const watched = () => {
      watchedMovieRepository.find.mockResolvedValue([
        { idTmdb: 1 },
        { idTmdb: 2 },
        { idTmdb: 3 },
        { idTmdb: 4 },
      ]);
      watchedSerieRepository.find.mockResolvedValue([
        { idTmdb: 10 },
        { idTmdb: 20 },
        { idTmdb: 30 },
      ]);
    };

    it('grava position por tipo', async () => {
      watched();
      const insert = jest.fn();
      favoriteRepository.manager.transaction.mockImplementation(
        async (run: (manager: unknown) => Promise<void>) =>
          run({ delete: jest.fn(), insert }),
      );
      favoriteRepository.find.mockResolvedValue([]);

      await service.setFavorites(7, [
        { type: 'movie', idTmdb: 1 },
        { type: 'serie', idTmdb: 10 },
        { type: 'movie', idTmdb: 2 },
        { type: 'serie', idTmdb: 20 },
      ]);

      const rows = insert.mock.calls[0][1];
      expect(rows).toEqual([
        { user: { id: 7 }, type: 'movie', idTmdb: 1, position: 1 },
        { user: { id: 7 }, type: 'movie', idTmdb: 2, position: 2 },
        { user: { id: 7 }, type: 'serie', idTmdb: 10, position: 1 },
        { user: { id: 7 }, type: 'serie', idTmdb: 20, position: 2 },
      ]);
    });

    it('rejeita mais de tres do mesmo tipo', async () => {
      watched();

      await expect(
        service.setFavorites(7, [
          { type: 'movie', idTmdb: 1 },
          { type: 'movie', idTmdb: 2 },
          { type: 'movie', idTmdb: 3 },
          { type: 'movie', idTmdb: 4 },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('aceita tres filmes e tres series', async () => {
      watched();
      favoriteRepository.manager.transaction.mockImplementation(
        async (run: (manager: unknown) => Promise<void>) =>
          run({ delete: jest.fn(), insert: jest.fn() }),
      );
      favoriteRepository.find.mockResolvedValue([]);

      await expect(
        service.setFavorites(7, [
          { type: 'movie', idTmdb: 1 },
          { type: 'movie', idTmdb: 2 },
          { type: 'movie', idTmdb: 3 },
          { type: 'serie', idTmdb: 10 },
          { type: 'serie', idTmdb: 20 },
          { type: 'serie', idTmdb: 30 },
        ]),
      ).resolves.toEqual([]);
    });

    it('ordena a leitura por tipo e depois posicao', async () => {
      favoriteRepository.find.mockResolvedValue([]);

      await service.setFavorites(7, []);

      expect(favoriteRepository.find).toHaveBeenCalledWith({
        where: { user: { id: 7 } },
        order: { type: 'ASC', position: 'ASC' },
      });
    });
  });

  describe('setCover', () => {
    it('rejeita titulo que nao esta nos assistidos', async () => {
      watchedMovieRepository.find.mockResolvedValue([{ idTmdb: 1 }]);
      watchedSerieRepository.find.mockResolvedValue([]);

      await expect(
        service.setCover(7, { type: 'movie', idTmdb: 999 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('limpa a capa quando recebe null', async () => {
      userRepository.update.mockResolvedValue({});

      await expect(service.setCover(7, null)).resolves.toBeNull();
      expect(userRepository.update).toHaveBeenCalledWith(7, {
        coverType: null,
        coverTmdbId: null,
      });
    });

    it('grava e devolve a capa resolvida', async () => {
      watchedMovieRepository.find.mockResolvedValue([{ idTmdb: 42 }]);
      watchedSerieRepository.find.mockResolvedValue([]);
      userRepository.update.mockResolvedValue({});
      movieRepository.find.mockResolvedValue([
        { idTmdb: 42, title: 'Duna', backdropPath: '/a.jpg' },
      ]);

      await expect(
        service.setCover(7, { type: 'movie', idTmdb: 42 }),
      ).resolves.toEqual({
        type: 'movie',
        idTmdb: 42,
        title: 'Duna',
        backdropPath: '/a.jpg',
      });
    });

    it('resolve capa de serie pelo nome', async () => {
      watchedMovieRepository.find.mockResolvedValue([]);
      watchedSerieRepository.find.mockResolvedValue([{ idTmdb: 99 }]);
      userRepository.update.mockResolvedValue({});
      serieRepository.find.mockResolvedValue([
        { idTmdb: 99, name: 'Severance', backdropPath: null },
      ]);

      await expect(
        service.setCover(7, { type: 'serie', idTmdb: 99 }),
      ).resolves.toEqual({
        type: 'serie',
        idTmdb: 99,
        title: 'Severance',
        backdropPath: null,
      });
    });

    it('devolve null quando o registro local sumiu', async () => {
      watchedMovieRepository.find.mockResolvedValue([{ idTmdb: 42 }]);
      watchedSerieRepository.find.mockResolvedValue([]);
      userRepository.update.mockResolvedValue({});
      movieRepository.find.mockResolvedValue([]);

      await expect(
        service.setCover(7, { type: 'movie', idTmdb: 42 }),
      ).resolves.toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('salva bio, nome e nome de usuario', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateProfile(7, {
        bio: '  Só filme bom  ',
        name: '  André Freitas  ',
        username: '  DreFreitas  ',
      });

      expect(userRepository.update).toHaveBeenCalledWith(7, {
        bio: 'Só filme bom',
        name: 'André Freitas',
        username: 'DreFreitas',
      });
      expect(result).toEqual({
        bio: 'Só filme bom',
        name: 'André Freitas',
        username: 'DreFreitas',
      });
    });

    it('rejeita nome de usuario ja usado por outra pessoa', async () => {
      userRepository.findOne.mockResolvedValue({ id: 99 });

      await expect(
        service.updateProfile(7, { username: 'andre' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('aceita o mesmo nome de usuario trocando so as maiusculas', async () => {
      userRepository.findOne.mockResolvedValue({ id: 7 });
      userRepository.update.mockResolvedValue({ affected: 1 });

      await expect(
        service.updateProfile(7, { username: 'ANDRE' }),
      ).resolves.toEqual({ username: 'ANDRE' });
    });

    it('converte violacao de unicidade do banco em conflito', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.update.mockRejectedValue({ code: '23505' });

      await expect(
        service.updateProfile(7, { username: 'andre' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejeita nome de usuario em branco', async () => {
      await expect(
        service.updateProfile(7, { username: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('nao toca em campos que nao vieram', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateProfile(7, { bio: null });

      expect(userRepository.update).toHaveBeenCalledWith(7, { bio: null });
      expect(result).toEqual({ bio: null });
    });
  });
});
