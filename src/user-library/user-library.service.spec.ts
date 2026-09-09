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
});
