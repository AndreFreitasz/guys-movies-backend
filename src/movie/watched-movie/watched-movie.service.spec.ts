import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WatchedMovieService } from './watched-movie.service';
import { WatchedMovie } from '../entities/watched-movie.entity';
import { CreatedMovieService } from '../created-movie/created-movie.service';
import { CreatedMovieDto } from '../dto/created-movie.dto';
import { MovieService } from '../movie.service';

const moviePayload: CreatedMovieDto = {
  title: 'Clube da Luta',
  overview: 'Um narrador insone conhece um vendedor de sabonetes',
  releaseDate: '1999-10-15',
  idTmdb: 550,
  posterPath: '/poster.jpg',
  director: 'David Fincher',
  voteAverage: 8.4,
};

describe('WatchedMovieService.rateMovie', () => {
  let service: WatchedMovieService;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    insert: jest.Mock;
    save: jest.Mock;
  };
  let createdMovieService: {
    createMovie: jest.Mock;
    findMovieByIdTmdb: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(value => value),
      insert: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    createdMovieService = {
      createMovie: jest.fn().mockResolvedValue({ message: 'ok' }),
      findMovieByIdTmdb: jest.fn().mockResolvedValue({ id: 7 }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WatchedMovieService,
        { provide: getRepositoryToken(WatchedMovie), useValue: repository },
        { provide: CreatedMovieService, useValue: createdMovieService },
        { provide: MovieService, useValue: { getMovieData: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(WatchedMovieService);
  });

  it('cria o registro vinculado ao filme quando ainda nao existe', async () => {
    repository.findOne.mockResolvedValue(null);

    const result = await service.rateMovie(1, 550, 4, moviePayload);

    expect(createdMovieService.createMovie).toHaveBeenCalledWith(moviePayload);
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        idUser: { id: 1 },
        idMovie: { id: 7 },
        idTmdb: 550,
        rating: 4,
        watchedAt: null,
      }),
    );
    expect(result.created).toBe(true);
  });

  it('apenas atualiza a nota quando o registro ja existe', async () => {
    repository.findOne.mockResolvedValue({ id: 3, idTmdb: 550, rating: 2 });

    const result = await service.rateMovie(1, 550, 5, moviePayload);

    expect(repository.insert).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5 }),
    );
    expect(result.created).toBe(false);
  });

  it('busca o registro escopado pelo usuario autenticado', async () => {
    repository.findOne.mockResolvedValue(null);

    await service.rateMovie(42, 550, 3, moviePayload);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { idUser: { id: 42 }, idTmdb: 550 },
    });
  });
});

describe('WatchedMovieService.updateWatchedAt', () => {
  let service: WatchedMovieService;
  let repository: { findOne: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn(value => Promise.resolve(value)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WatchedMovieService,
        { provide: getRepositoryToken(WatchedMovie), useValue: repository },
        {
          provide: CreatedMovieService,
          useValue: { createMovie: jest.fn(), findMovieByIdTmdb: jest.fn() },
        },
        { provide: MovieService, useValue: { getMovieData: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(WatchedMovieService);
  });

  it('busca sempre pelo usuario autenticado, nunca so pelo idTmdb', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.updateWatchedAt(42, 550, '2024-05-01'),
    ).rejects.toMatchObject({ status: 404 });

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { idUser: { id: 42 }, idTmdb: 550 },
      relations: { idMovie: true },
    });
  });

  it('nao edita o registro de outro usuario', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.updateWatchedAt(2, 550, '2024-05-01'),
    ).rejects.toMatchObject({ status: 404 });

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('aceita null e devolve o item com a data limpa', async () => {
    repository.findOne.mockResolvedValue({
      id: 3,
      idTmdb: 550,
      rating: 4,
      watchedAt: new Date('2024-05-01'),
      createdAt: new Date('2024-04-01'),
      idMovie: {
        title: 'Clube da Luta',
        overview: 'Sinopse',
        posterPath: '/poster.jpg',
        releaseDate: '1999-10-15',
        director: 'David Fincher',
        voteAverage: 8.4,
      },
    });

    const item = await service.updateWatchedAt(1, 550, null);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ watchedAt: null }),
    );
    expect(item).toMatchObject({
      idTmdb: 550,
      title: 'Clube da Luta',
      watchedAt: null,
      rating: 4,
    });
  });

  it('rejeita data futura', async () => {
    repository.findOne.mockResolvedValue({ id: 3, idTmdb: 550 });
    const future = new Date(Date.now() + 86400000).toISOString();

    await expect(service.updateWatchedAt(1, 550, future)).rejects.toMatchObject(
      { status: 400 },
    );

    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('WatchedMovieService.setWatchSource', () => {
  let service: WatchedMovieService;
  let watchedMovieRepository: { findOne: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    watchedMovieRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 3, idTmdb: 550 }),
      save: jest.fn(value => Promise.resolve(value)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WatchedMovieService,
        {
          provide: getRepositoryToken(WatchedMovie),
          useValue: watchedMovieRepository,
        },
        {
          provide: CreatedMovieService,
          useValue: { createMovie: jest.fn(), findMovieByIdTmdb: jest.fn() },
        },
        { provide: MovieService, useValue: { getMovieData: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(WatchedMovieService);
  });

  it('rejeita providerId quando watchSource nao e streaming', async () => {
    await expect(
      service.setWatchSource(1, 550, { watchSource: 'cinema', providerId: 8 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita streaming sem providerId', async () => {
    await expect(
      service.setWatchSource(1, 550, { watchSource: 'streaming' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('limpa as duas colunas quando o corpo vem vazio', async () => {
    await service.setWatchSource(1, 550, {});
    expect(watchedMovieRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: null, watchSource: null }),
    );
  });

  it('lanca NotFound quando o filme nao esta na estante do usuario', async () => {
    watchedMovieRepository.findOne.mockResolvedValue(null);
    await expect(
      service.setWatchSource(1, 550, { watchSource: 'cinema' }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('WatchedMovieService.markAsWatched', () => {
  let service: WatchedMovieService;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
  };
  let createdMovieService: {
    createMovie: jest.Mock;
    findMovieByIdTmdb: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(value => value),
      insert: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    createdMovieService = {
      createMovie: jest.fn().mockResolvedValue({ message: 'ok' }),
      findMovieByIdTmdb: jest.fn().mockResolvedValue({ id: 7 }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WatchedMovieService,
        { provide: getRepositoryToken(WatchedMovie), useValue: repository },
        { provide: CreatedMovieService, useValue: createdMovieService },
        { provide: MovieService, useValue: { getMovieData: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(WatchedMovieService);
  });

  it('desmarca mesmo com combinacao invalida de watchSource e providerId no corpo', async () => {
    repository.findOne.mockResolvedValue({ id: 3, idTmdb: 550 });

    const result = await service.markAsWatched(new Date(), 1, {
      ...moviePayload,
      watchSource: 'cinema',
      providerId: 8,
    });

    expect(result).toBe('Filme desmarcado com sucesso');
    expect(repository.delete).toHaveBeenCalled();
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('rejeita a criacao quando a combinacao de watchSource e providerId e invalida', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.markAsWatched(new Date(), 1, {
        ...moviePayload,
        watchSource: 'cinema',
        providerId: 8,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(repository.insert).not.toHaveBeenCalled();
  });
});

describe('WatchedMovieService.listWatchedMovies', () => {
  let service: WatchedMovieService;
  let watchedMovieRepository: { find: jest.Mock };
  let movieService: { getMovieData: jest.Mock };

  beforeEach(async () => {
    watchedMovieRepository = {
      find: jest.fn(),
    };
    movieService = {
      getMovieData: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WatchedMovieService,
        {
          provide: getRepositoryToken(WatchedMovie),
          useValue: watchedMovieRepository,
        },
        {
          provide: CreatedMovieService,
          useValue: { createMovie: jest.fn(), findMovieByIdTmdb: jest.fn() },
        },
        { provide: MovieService, useValue: movieService },
      ],
    }).compile();

    service = moduleRef.get(WatchedMovieService);
  });

  it('declarado vence a disponibilidade', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      {
        idTmdb: 550,
        providerId: 8,
        watchSource: 'streaming',
        rating: null,
        watchedAt: null,
        createdAt: new Date('2024-01-01'),
        idMovie: null,
      },
    ]);

    const result = await service.listWatchedMovies(1, [384]);

    expect(result.items).toHaveLength(0);
    expect(movieService.getMovieData).not.toHaveBeenCalled();
  });

  it('sem declaracao cai no fallback de disponibilidade', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      {
        idTmdb: 550,
        providerId: null,
        watchSource: null,
        rating: null,
        watchedAt: null,
        createdAt: new Date('2024-01-01'),
        idMovie: null,
      },
    ]);
    movieService.getMovieData.mockResolvedValue({
      providers: { flatrate: [{ id_provider: 384 }, { id_provider: 8 }] },
    });

    const result = await service.listWatchedMovies(1, [384]);

    expect(result.items).toHaveLength(1);
  });

  it('cinema nao casa com filtro de streaming nem cai no fallback', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      {
        idTmdb: 550,
        providerId: null,
        watchSource: 'cinema',
        rating: null,
        watchedAt: null,
        createdAt: new Date('2024-01-01'),
        idMovie: null,
      },
    ]);

    const result = await service.listWatchedMovies(1, [8]);

    expect(result.items).toHaveLength(0);
    expect(movieService.getMovieData).not.toHaveBeenCalled();
  });

  it('tmdb fora nao derruba a lista e sinaliza availabilityFailed', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      {
        idTmdb: 550,
        providerId: 8,
        watchSource: 'streaming',
        rating: null,
        watchedAt: null,
        createdAt: new Date('2024-01-01'),
        idMovie: null,
      },
      {
        idTmdb: 551,
        providerId: null,
        watchSource: null,
        rating: null,
        watchedAt: null,
        createdAt: new Date('2024-01-02'),
        idMovie: null,
      },
    ]);
    movieService.getMovieData.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.listWatchedMovies(1, [8]);

    expect(result.items).toHaveLength(1);
    expect(result.availabilityFailed).toBe(true);
  });

  it('sem providers nao chama a tmdb', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      {
        idTmdb: 550,
        providerId: null,
        watchSource: null,
        rating: null,
        watchedAt: null,
        createdAt: new Date('2024-01-01'),
        idMovie: null,
      },
    ]);

    const result = await service.listWatchedMovies(1);

    expect(movieService.getMovieData).not.toHaveBeenCalled();
    expect(result.availabilityFailed).toBe(false);
  });
});
