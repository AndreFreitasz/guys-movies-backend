import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WatchedSerieService } from './watched-serie.service';
import { WatchedSerie } from '../entities/watched-serie.entity';
import { CreatedSerieService } from '../created-serie/created-serie.service';
import { CreatedSerieDto } from '../dto/created-serie.dto';

const seriePayload: CreatedSerieDto = {
  name: 'Dark',
  overview: 'Quatro familias procuram uma crianca desaparecida',
  firstAirDate: '2017-12-01',
  idTmdb: 70523,
  posterPath: '/poster.jpg',
  numberOfSeasons: 3,
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
        { provide: CreatedSerieService, useValue: createdSerieService },
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

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn(value => Promise.resolve(value)),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WatchedSerieService,
        { provide: getRepositoryToken(WatchedSerie), useValue: repository },
        {
          provide: CreatedSerieService,
          useValue: { createSerie: jest.fn(), findSerieByIdTmdb: jest.fn() },
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

  it('rejeita data futura', async () => {
    repository.findOne.mockResolvedValue({ id: 3, idTmdb: 70523 });
    const future = new Date(Date.now() + 86400000).toISOString();

    await expect(
      service.updateWatchedAt(1, 70523, future),
    ).rejects.toMatchObject({ status: 400 });

    expect(repository.save).not.toHaveBeenCalled();
  });
});
