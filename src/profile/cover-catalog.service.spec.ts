import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CoverCatalogService } from './cover-catalog.service';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSerie } from '../serie/entities/watched-serie.entity';
import { Movies } from '../movie/entities/movies.entity';
import { Series } from '../serie/entities/series.entity';
import { MovieService } from '../movie/movie.service';
import { SerieService } from '../serie/serie.service';

describe('CoverCatalogService', () => {
  let service: CoverCatalogService;
  let watchedMovieRepository: { find: jest.Mock };
  let watchedSerieRepository: { find: jest.Mock };
  let movieRepository: { find: jest.Mock; update: jest.Mock };
  let serieRepository: { find: jest.Mock; update: jest.Mock };
  let movieService: { getMovieData: jest.Mock };
  let serieService: { getSerieData: jest.Mock };

  beforeEach(async () => {
    watchedMovieRepository = { find: jest.fn().mockResolvedValue([]) };
    watchedSerieRepository = { find: jest.fn().mockResolvedValue([]) };
    movieRepository = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    };
    serieRepository = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    };
    movieService = { getMovieData: jest.fn() };
    serieService = { getSerieData: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CoverCatalogService,
        {
          provide: getRepositoryToken(WatchedMovie),
          useValue: watchedMovieRepository,
        },
        {
          provide: getRepositoryToken(WatchedSerie),
          useValue: watchedSerieRepository,
        },
        { provide: getRepositoryToken(Movies), useValue: movieRepository },
        { provide: getRepositoryToken(Series), useValue: serieRepository },
        { provide: MovieService, useValue: movieService },
        { provide: SerieService, useValue: serieService },
      ],
    }).compile();

    service = moduleRef.get(CoverCatalogService);
  });

  it('omite titulos que continuam sem backdrop', async () => {
    watchedMovieRepository.find.mockResolvedValue([{ idTmdb: 1 }]);
    movieRepository.find.mockResolvedValue([
      { idTmdb: 1, title: 'Duna', backdropPath: null },
    ]);
    movieService.getMovieData.mockResolvedValue({ wallpaper_path: null });

    await expect(service.list(7)).resolves.toEqual([]);
  });

  it('devolve o que ja tem backdrop sem chamar a TMDB', async () => {
    watchedMovieRepository.find.mockResolvedValue([{ idTmdb: 1 }]);
    movieRepository.find.mockResolvedValue([
      { idTmdb: 1, title: 'Duna', backdropPath: '/a.jpg' },
    ]);

    await expect(service.list(7)).resolves.toEqual([
      { type: 'movie', idTmdb: 1, title: 'Duna', backdropPath: '/a.jpg' },
    ]);
    expect(movieService.getMovieData).not.toHaveBeenCalled();
  });

  it('preenche e persiste o backdrop que faltava', async () => {
    watchedMovieRepository.find.mockResolvedValue([{ idTmdb: 1 }]);
    movieRepository.find.mockResolvedValue([
      { idTmdb: 1, title: 'Duna', backdropPath: null },
    ]);
    movieService.getMovieData.mockResolvedValue({
      wallpaper_path: 'https://image.tmdb.org/t/p/w1280/a.jpg',
    });

    await expect(service.list(7)).resolves.toEqual([
      {
        type: 'movie',
        idTmdb: 1,
        title: 'Duna',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/a.jpg',
      },
    ]);
    expect(movieRepository.update).toHaveBeenCalledWith(
      { idTmdb: 1 },
      { backdropPath: 'https://image.tmdb.org/t/p/w1280/a.jpg' },
    );
  });

  it('preenche backdrop de serie pelo serie service', async () => {
    watchedSerieRepository.find.mockResolvedValue([{ idTmdb: 99 }]);
    serieRepository.find.mockResolvedValue([
      { idTmdb: 99, name: 'Severance', backdropPath: null },
    ]);
    serieService.getSerieData.mockResolvedValue({
      wallpaper_path: 'https://image.tmdb.org/t/p/w1280/s.jpg',
    });

    await expect(service.list(7)).resolves.toEqual([
      {
        type: 'serie',
        idTmdb: 99,
        title: 'Severance',
        backdropPath: 'https://image.tmdb.org/t/p/w1280/s.jpg',
      },
    ]);
    expect(serieRepository.update).toHaveBeenCalledWith(
      { idTmdb: 99 },
      { backdropPath: 'https://image.tmdb.org/t/p/w1280/s.jpg' },
    );
  });

  it('respeita o teto de backfill por request', async () => {
    const ids = Array.from({ length: 30 }, (_, index) => ({
      idTmdb: index + 1,
    }));
    watchedMovieRepository.find.mockResolvedValue(ids);
    movieRepository.find.mockResolvedValue(
      ids.map(row => ({
        idTmdb: row.idTmdb,
        title: `T${row.idTmdb}`,
        backdropPath: null,
      })),
    );
    movieService.getMovieData.mockResolvedValue({ wallpaper_path: null });

    await service.list(7);

    expect(movieService.getMovieData.mock.calls.length).toBe(24);
  });

  it('nao derruba a listagem quando a TMDB falha', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      { idTmdb: 1 },
      { idTmdb: 2 },
    ]);
    movieRepository.find.mockResolvedValue([
      { idTmdb: 1, title: 'Duna', backdropPath: null },
      { idTmdb: 2, title: 'Arrival', backdropPath: '/b.jpg' },
    ]);
    movieService.getMovieData.mockRejectedValue(new Error('tmdb fora do ar'));

    await expect(service.list(7)).resolves.toEqual([
      { type: 'movie', idTmdb: 2, title: 'Arrival', backdropPath: '/b.jpg' },
    ]);
  });

  it('filtra por termo de busca', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      { idTmdb: 1 },
      { idTmdb: 2 },
    ]);
    movieRepository.find.mockResolvedValue([
      { idTmdb: 1, title: 'Duna', backdropPath: '/a.jpg' },
      { idTmdb: 2, title: 'Arrival', backdropPath: '/b.jpg' },
    ]);

    await expect(service.list(7, 'arr')).resolves.toEqual([
      { type: 'movie', idTmdb: 2, title: 'Arrival', backdropPath: '/b.jpg' },
    ]);
  });

  it('ordena por titulo', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      { idTmdb: 1 },
      { idTmdb: 2 },
    ]);
    movieRepository.find.mockResolvedValue([
      { idTmdb: 1, title: 'Zodiac', backdropPath: '/z.jpg' },
      { idTmdb: 2, title: 'Arrival', backdropPath: '/a.jpg' },
    ]);

    const result = await service.list(7);

    expect(result.map(option => option.title)).toEqual(['Arrival', 'Zodiac']);
  });
});
