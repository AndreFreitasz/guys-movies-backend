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
