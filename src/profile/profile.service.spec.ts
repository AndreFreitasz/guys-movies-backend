import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { ProfileService } from './profile.service';
import { User } from '../users/entities/user.entity';
import { Follow } from '../users/entities/follow.entity';
import { FavoriteTitle } from '../users/entities/favorite-title.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';

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
});
