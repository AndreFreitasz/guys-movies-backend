import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserLibraryService } from './user-library.service';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WaitingMovies } from '../movie/entities/waiting-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { WaitingSeries } from '../serie/entities/waiting-serie.entity';

describe('UserLibraryService', () => {
  let service: UserLibraryService;
  let watchedMovieRepository: { find: jest.Mock };
  let waitingMovieRepository: { find: jest.Mock };
  let watchedSerieRepository: { find: jest.Mock };
  let waitingSerieRepository: { find: jest.Mock };

  beforeEach(async () => {
    watchedMovieRepository = { find: jest.fn() };
    waitingMovieRepository = { find: jest.fn() };
    watchedSerieRepository = { find: jest.fn() };
    waitingSerieRepository = { find: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UserLibraryService,
        {
          provide: getRepositoryToken(WatchedMovie),
          useValue: watchedMovieRepository,
        },
        {
          provide: getRepositoryToken(WaitingMovies),
          useValue: waitingMovieRepository,
        },
        {
          provide: getRepositoryToken(WatchedSerie),
          useValue: watchedSerieRepository,
        },
        {
          provide: getRepositoryToken(WaitingSeries),
          useValue: waitingSerieRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(UserLibraryService);
  });

  it('devolve apenas os ids das quatro colecoes do usuario', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      { idTmdb: 550 },
      { idTmdb: 551 },
    ]);
    waitingMovieRepository.find.mockResolvedValue([{ idTmdb: 552 }]);
    watchedSerieRepository.find.mockResolvedValue([{ idTmdb: 70523 }]);
    waitingSerieRepository.find.mockResolvedValue([]);

    const result = await service.getLibrary(1);

    expect(result).toEqual({
      watchedMovies: [550, 551],
      watchedSeries: [70523],
      watchlistMovies: [552],
      watchlistSeries: [],
    });
  });

  it('filtra as quatro consultas pelo usuario recebido', async () => {
    watchedMovieRepository.find.mockResolvedValue([]);
    waitingMovieRepository.find.mockResolvedValue([]);
    watchedSerieRepository.find.mockResolvedValue([]);
    waitingSerieRepository.find.mockResolvedValue([]);

    await service.getLibrary(7);

    [
      watchedMovieRepository,
      waitingMovieRepository,
      watchedSerieRepository,
      waitingSerieRepository,
    ].forEach(repository => {
      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.anything() }),
      );
      const call = repository.find.mock.calls[0][0];
      expect(JSON.stringify(call.where)).toContain('7');
    });
  });

  it('nao quebra quando um idTmdb vem nulo', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      { idTmdb: 550 },
      { idTmdb: null },
    ]);
    waitingMovieRepository.find.mockResolvedValue([]);
    watchedSerieRepository.find.mockResolvedValue([]);
    waitingSerieRepository.find.mockResolvedValue([]);

    const result = await service.getLibrary(1);

    expect(result.watchedMovies).toEqual([550]);
  });

  describe('getWatchlist', () => {
    const waitingMovieRow = {
      idTmdb: 603,
      createdAt: new Date('2026-09-01T10:00:00Z'),
      movie: {
        title: 'Matrix',
        posterPath: '/matrix.jpg',
        releaseDate: '1999-03-31',
        voteAverage: 8.2,
      },
    };

    const waitingSerieRow = {
      idTmdb: 1396,
      createdAt: new Date('2026-09-05T10:00:00Z'),
      serie: {
        name: 'Breaking Bad',
        posterPath: '/bb.jpg',
        firstAirDate: '2008-01-20',
        voteAverage: 8.9,
      },
    };

    it('mescla filmes e series normalizando os campos', async () => {
      waitingMovieRepository.find.mockResolvedValue([waitingMovieRow]);
      waitingSerieRepository.find.mockResolvedValue([waitingSerieRow]);
      watchedMovieRepository.find.mockResolvedValue([]);
      watchedSerieRepository.find.mockResolvedValue([]);

      const result = await service.getWatchlist(1);

      expect(result.items).toEqual([
        {
          type: 'serie',
          idTmdb: 1396,
          title: 'Breaking Bad',
          posterPath: '/bb.jpg',
          releaseDate: '2008-01-20',
          voteAverage: 8.9,
          addedAt: '2026-09-05T10:00:00.000Z',
          watched: false,
        },
        {
          type: 'movie',
          idTmdb: 603,
          title: 'Matrix',
          posterPath: '/matrix.jpg',
          releaseDate: '1999-03-31',
          voteAverage: 8.2,
          addedAt: '2026-09-01T10:00:00.000Z',
          watched: false,
        },
      ]);
      expect(result.stats).toEqual({ total: 2, movies: 1, series: 1 });
    });

    it('descarta linha com idTmdb nulo', async () => {
      waitingMovieRepository.find.mockResolvedValue([
        { ...waitingMovieRow, idTmdb: null },
      ]);
      waitingSerieRepository.find.mockResolvedValue([]);
      watchedMovieRepository.find.mockResolvedValue([]);
      watchedSerieRepository.find.mockResolvedValue([]);

      const result = await service.getWatchlist(1);

      expect(result.items).toEqual([]);
      expect(result.stats.total).toBe(0);
    });

    it('descarta linha cuja relacao com o catalogo sumiu', async () => {
      waitingMovieRepository.find.mockResolvedValue([
        { idTmdb: 603, createdAt: new Date('2026-09-01T10:00:00Z'), movie: null },
      ]);
      waitingSerieRepository.find.mockResolvedValue([]);
      watchedMovieRepository.find.mockResolvedValue([]);
      watchedSerieRepository.find.mockResolvedValue([]);

      const result = await service.getWatchlist(1);

      expect(result.items).toEqual([]);
    });

    it('marca watched cruzando com os assistidos do usuario', async () => {
      waitingMovieRepository.find.mockResolvedValue([waitingMovieRow]);
      waitingSerieRepository.find.mockResolvedValue([]);
      watchedMovieRepository.find.mockResolvedValue([{ idTmdb: 603 }]);
      watchedSerieRepository.find.mockResolvedValue([]);

      const result = await service.getWatchlist(1);

      expect(result.items[0].watched).toBe(true);
    });

    it('nao troca o flag entre filme e serie de mesmo idTmdb', async () => {
      waitingMovieRepository.find.mockResolvedValue([waitingMovieRow]);
      waitingSerieRepository.find.mockResolvedValue([
        { ...waitingSerieRow, idTmdb: 603 },
      ]);
      watchedMovieRepository.find.mockResolvedValue([]);
      watchedSerieRepository.find.mockResolvedValue([{ idTmdb: 603 }]);

      const result = await service.getWatchlist(1);

      const movie = result.items.find(item => item.type === 'movie');
      const serie = result.items.find(item => item.type === 'serie');

      expect(movie.watched).toBe(false);
      expect(serie.watched).toBe(true);
    });

    it('escopa as quatro consultas pelo usuario', async () => {
      waitingMovieRepository.find.mockResolvedValue([]);
      waitingSerieRepository.find.mockResolvedValue([]);
      watchedMovieRepository.find.mockResolvedValue([]);
      watchedSerieRepository.find.mockResolvedValue([]);

      await service.getWatchlist(7);

      expect(waitingMovieRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user: { id: 7 } } }),
      );
      expect(waitingSerieRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user: { id: 7 } } }),
      );
      expect(watchedMovieRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { idUser: { id: 7 } } }),
      );
      expect(watchedSerieRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user: { id: 7 } } }),
      );
    });
  });
});
