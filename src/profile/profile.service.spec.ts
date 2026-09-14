import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
});
