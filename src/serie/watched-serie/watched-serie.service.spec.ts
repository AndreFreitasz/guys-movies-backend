import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WatchedSerieService } from './watched-serie.service';
import { WatchedSerie } from '../entities/watched-serie.entity';
import { WatchedSeason } from '../entities/watched-season.entity';
import { Series } from '../entities/series.entity';
import { SerieService } from '../serie.service';
import { WatchedSeasonService } from './watched-season.service';
import { CreatedSerieService } from '../created-serie/created-serie.service';
import { CreatedSerieDto } from '../dto/created-serie.dto';

const seriePayload: CreatedSerieDto = {
  name: 'Dark',
  overview: 'Quatro familias procuram uma crianca desaparecida',
  firstAirDate: '2017-12-01',
  idTmdb: 70523,
  posterPath: '/poster.jpg',
  voteAverage: 8.3,
};

describe('WatchedSerieService.rateSerie', () => {
  let service: WatchedSerieService;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    insert: jest.Mock;
    save: jest.Mock;
  };
  let createdSerieService: {
    createSerie: jest.Mock;
    findSerieByIdTmdb: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(value => value),
      insert: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    createdSerieService = {
      createSerie: jest.fn().mockResolvedValue({ message: 'ok' }),
      findSerieByIdTmdb: jest.fn().mockResolvedValue({ id: 7 }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WatchedSerieService,
        { provide: getRepositoryToken(WatchedSerie), useValue: repository },
        {
          provide: getRepositoryToken(WatchedSeason),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(Series),
          useValue: { save: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: CreatedSerieService, useValue: createdSerieService },
        { provide: SerieService, useValue: { getSerieData: jest.fn() } },
        {
          provide: WatchedSeasonService,
          useValue: { completeSerie: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(WatchedSerieService);
  });

  it('cria o registro vinculado a serie quando ainda nao existe', async () => {
    repository.findOne.mockResolvedValue(null);

    const result = await service.rateSerie(1, 70523, 4, seriePayload);

    expect(createdSerieService.createSerie).toHaveBeenCalledWith(seriePayload);
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 1 },
        serie: { id: 7 },
        idTmdb: 70523,
        rating: 4,
        watchedAt: null,
      }),
    );
    expect(result.created).toBe(true);
  });

  it('apenas atualiza a nota quando o registro ja existe', async () => {
    repository.findOne.mockResolvedValue({ id: 3, idTmdb: 70523, rating: 2 });

    const result = await service.rateSerie(1, 70523, 5, seriePayload);

    expect(repository.insert).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5 }),
    );
    expect(result.created).toBe(false);
  });

  it('busca o registro escopado pelo usuario autenticado', async () => {
    repository.findOne.mockResolvedValue(null);

    await service.rateSerie(42, 70523, 3, seriePayload);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { user: { id: 42 }, idTmdb: 70523 },
    });
  });
});

describe('WatchedSerieService.updateWatchedAt', () => {
  let service: WatchedSerieService;
  let repository: { findOne: jest.Mock; save: jest.Mock };
  let watchedSeasonRepository: { find: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn(value => Promise.resolve(value)),
    };
    watchedSeasonRepository = { find: jest.fn().mockResolvedValue([]) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WatchedSerieService,
        { provide: getRepositoryToken(WatchedSerie), useValue: repository },
        {
          provide: getRepositoryToken(WatchedSeason),
          useValue: watchedSeasonRepository,
        },
        {
          provide: getRepositoryToken(Series),
          useValue: { save: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: CreatedSerieService,
          useValue: { createSerie: jest.fn(), findSerieByIdTmdb: jest.fn() },
        },
        { provide: SerieService, useValue: { getSerieData: jest.fn() } },
        {
          provide: WatchedSeasonService,
          useValue: { completeSerie: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(WatchedSerieService);
  });

  it('busca sempre pelo usuario autenticado, nunca so pelo idTmdb', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.updateWatchedAt(42, 70523, '2024-05-01'),
    ).rejects.toMatchObject({ status: 404 });

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { user: { id: 42 }, idTmdb: 70523 },
      relations: { serie: true },
    });
  });

  it('nao edita o registro de outro usuario', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.updateWatchedAt(2, 70523, '2024-05-01'),
    ).rejects.toMatchObject({ status: 404 });

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('aceita null e devolve o item com a data limpa', async () => {
    repository.findOne.mockResolvedValue({
      id: 3,
      idTmdb: 70523,
      rating: 4,
      watchedAt: new Date('2024-05-01'),
      createdAt: new Date('2024-04-01'),
      serie: {
        name: 'Dark',
        overview: 'Sinopse',
        posterPath: '/poster.jpg',
        firstAirDate: '2017-12-01',
        numberOfSeasons: 3,
        voteAverage: 8.3,
      },
    });

    const item = await service.updateWatchedAt(1, 70523, null);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ watchedAt: null }),
    );
    expect(item).toMatchObject({
      idTmdb: 70523,
      name: 'Dark',
      watchedAt: null,
      rating: 4,
    });
  });

  it('updateWatchedAt devolve o progresso real, nunca zero', async () => {
    repository.findOne.mockResolvedValue({
      idTmdb: 70523,
      rating: null,
      watchedAt: null,
      completedAt: null,
      createdAt: new Date('2025-01-05'),
      serie: { name: 'Dark', numberOfSeasons: 3, episodeRunTime: 60 },
    });
    watchedSeasonRepository.find.mockResolvedValue([
      { idTmdb: 70523, seasonNumber: 1, episodeCount: 10 },
      { idTmdb: 70523, seasonNumber: 2, episodeCount: 8 },
    ]);

    const result = await service.updateWatchedAt(1, 70523, '2025-01-05');

    expect(result.watchedSeasons).toBe(2);
    expect(result.watchedEpisodes).toBe(18);
  });

  it('rejeita data futura', async () => {
    repository.findOne.mockResolvedValue({ id: 3, idTmdb: 70523 });
    const future = new Date(Date.now() + 86400000).toISOString();

    await expect(
      service.updateWatchedAt(1, 70523, future),
    ).rejects.toMatchObject({ status: 400 });

    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('WatchedSerieService.listWatchedSeries', () => {
  let service: WatchedSerieService;
  let watchedSerieRepository: { find: jest.Mock };
  let watchedSeasonRepository: { find: jest.Mock };
  let serieRepository: { save: jest.Mock };
  let serieService: { getSerieData: jest.Mock };
  let watchedSeasonService: { completeSerie: jest.Mock };

  beforeEach(async () => {
    watchedSerieRepository = { find: jest.fn() };
    watchedSeasonRepository = { find: jest.fn() };
    serieRepository = { save: jest.fn().mockResolvedValue(undefined) };
    serieService = { getSerieData: jest.fn() };
    watchedSeasonService = {
      completeSerie: jest.fn().mockResolvedValue({
        watchedSeasons: 0,
        watchedEpisodes: 0,
        completedAt: null,
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WatchedSerieService,
        {
          provide: getRepositoryToken(WatchedSerie),
          useValue: watchedSerieRepository,
        },
        {
          provide: getRepositoryToken(WatchedSeason),
          useValue: watchedSeasonRepository,
        },
        { provide: getRepositoryToken(Series), useValue: serieRepository },
        {
          provide: CreatedSerieService,
          useValue: { createSerie: jest.fn(), findSerieByIdTmdb: jest.fn() },
        },
        { provide: SerieService, useValue: serieService },
        { provide: WatchedSeasonService, useValue: watchedSeasonService },
      ],
    }).compile();

    service = moduleRef.get(WatchedSerieService);
  });

  it('responde a lista mesmo com a TMDB fora do ar', async () => {
    serieService.getSerieData.mockRejectedValue(new Error('ECONNREFUSED'));
    watchedSerieRepository.find.mockResolvedValue([
      {
        idTmdb: 70523,
        rating: 4,
        watchedAt: null,
        completedAt: new Date('2025-01-05'),
        createdAt: new Date('2025-01-05'),
        serie: { name: 'Dark', numberOfSeasons: 3, episodeRunTime: null },
      },
    ]);
    watchedSeasonRepository.find.mockResolvedValue([]);

    const result = await service.listWatchedSeries(1);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].watchedEpisodes).toBe(0);
    expect(result.stats.total).toBe(1);
  });
});
