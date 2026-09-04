import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException } from '@nestjs/common';
import { WatchedSeasonService } from './watched-season.service';
import { WatchedSeason } from '../entities/watched-season.entity';
import { WatchedSerie } from '../entities/watched-serie.entity';
import { Series } from '../entities/series.entity';
import { SerieService } from '../serie.service';
import { CreatedSerieService } from '../created-serie/created-serie.service';

const serieData = {
  id: 70523,
  seasons: [
    { season_number: 1, name: 'Temporada 1', episode_count: 10 },
    { season_number: 2, name: 'Temporada 2', episode_count: 8 },
  ],
  episodeRunTime: 60,
  number_of_seasons: 2,
};

describe('WatchedSeasonService', () => {
  let service: WatchedSeasonService;
  let seasonRepository: any;
  let serieRepository: any;
  let seriesCatalogRepository: any;
  let serieService: any;
  let createdSerieService: any;

  beforeEach(async () => {
    seasonRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(entity => entity),
      save: jest.fn(entity => Promise.resolve({ id: 1, ...entity })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn().mockResolvedValue(0),
    };
    serieRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 9, idTmdb: 70523 }),
      create: jest.fn(entity => entity),
      save: jest.fn(entity => Promise.resolve(entity)),
    };
    seriesCatalogRepository = {
      save: jest.fn(entity => Promise.resolve(entity)),
    };
    serieService = { getSerieData: jest.fn().mockResolvedValue(serieData) };
    createdSerieService = {
      findSerieByIdTmdb: jest.fn().mockResolvedValue({ id: 9 }),
      createSerie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchedSeasonService,
        {
          provide: getRepositoryToken(WatchedSeason),
          useValue: seasonRepository,
        },
        {
          provide: getRepositoryToken(WatchedSerie),
          useValue: serieRepository,
        },
        {
          provide: getRepositoryToken(Series),
          useValue: seriesCatalogRepository,
        },
        { provide: SerieService, useValue: serieService },
        { provide: CreatedSerieService, useValue: createdSerieService },
      ],
    }).compile();

    service = module.get<WatchedSeasonService>(WatchedSeasonService);
  });

  it('resolve o episodeCount pela TMDB, nunca pelo cliente', async () => {
    await service.markSeason(1, 70523, 1, null);

    expect(seasonRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ seasonNumber: 1, episodeCount: 10 }),
    );
  });

  it('marcar duas vezes nao cria linha duplicada', async () => {
    seasonRepository.findOne.mockResolvedValueOnce({
      id: 5,
      seasonNumber: 1,
      episodeCount: 10,
    });

    await service.markSeason(1, 70523, 1, null);

    expect(seasonRepository.create).not.toHaveBeenCalled();
  });

  it('recusa temporada que nao existe na serie', async () => {
    await expect(service.markSeason(1, 70523, 99, null)).rejects.toThrow(
      HttpException,
    );
  });

  it('recusa a temporada 0', async () => {
    await expect(service.markSeason(1, 70523, 0, null)).rejects.toThrow(
      HttpException,
    );
  });

  it('atualiza numberOfSeasons e episodeRunTime da serie com os dados da TMDB', async () => {
    await service.markSeason(1, 70523, 1, null);

    expect(seriesCatalogRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ numberOfSeasons: 2, episodeRunTime: 60 }),
    );
  });

  it('preserva o episodeRunTime salvo quando a TMDB devolve null', async () => {
    createdSerieService.findSerieByIdTmdb.mockResolvedValue({
      id: 9,
      episodeRunTime: 45,
    });
    serieService.getSerieData.mockResolvedValueOnce({
      ...serieData,
      episodeRunTime: null,
    });

    await service.markSeason(1, 70523, 1, null);

    expect(seriesCatalogRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ numberOfSeasons: 2, episodeRunTime: 45 }),
    );
  });

  it('cria a linha watched_serie ao marcar temporada quando o usuario e novo', async () => {
    serieRepository.findOne.mockResolvedValueOnce(null);

    await service.markSeason(1, 70523, 1, null);

    expect(serieRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 1 },
        idTmdb: 70523,
        watchedAt: null,
      }),
    );
    expect(serieRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ idTmdb: 70523, watchedAt: null }),
    );
  });

  it('nao cria uma segunda linha watched_serie quando ela ja existe', async () => {
    await service.markSeason(1, 70523, 1, null);

    expect(serieRepository.create).not.toHaveBeenCalled();
  });

  it('ignora violacao de unicidade ao marcar a mesma temporada em paralelo', async () => {
    const conflict = Object.assign(new Error('duplicate key'), {
      code: '23505',
    });
    seasonRepository.save.mockRejectedValueOnce(conflict);

    const result = await service.markSeason(1, 70523, 1, null);

    expect(result).toEqual(
      expect.objectContaining({ watchedSeasons: 0, watchedEpisodes: 0 }),
    );
  });

  it('propaga erros que nao sao violacao de unicidade', async () => {
    seasonRepository.save.mockRejectedValueOnce(new Error('conexao caiu'));

    await expect(service.markSeason(1, 70523, 1, null)).rejects.toThrow(
      'conexao caiu',
    );
  });

  it('desmarcar busca sempre pelo usuario autenticado', async () => {
    await service.unmarkSeason(7, 70523, 1);

    expect(seasonRepository.delete).toHaveBeenCalledWith({
      user: { id: 7 },
      idTmdb: 70523,
      seasonNumber: 1,
    });
  });

  it('desmarcar nao apaga o registro de outro usuario', async () => {
    seasonRepository.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(service.unmarkSeason(7, 70523, 1)).rejects.toThrow(
      HttpException,
    );
  });

  it('marca todas as temporadas de uma vez, com watchedAt nulo', async () => {
    await service.completeSerie(1, 70523, null);

    const saved = seasonRepository.save.mock.calls.map(call => call[0]);
    expect(saved).toHaveLength(2);
    expect(saved.every(season => season.watchedAt === null)).toBe(true);
    expect(saved.map(season => season.seasonNumber)).toEqual([1, 2]);
  });

  it('nao duplica temporada ja marcada ao completar', async () => {
    seasonRepository.find.mockResolvedValueOnce([
      { seasonNumber: 1, episodeCount: 10 },
    ]);

    await service.completeSerie(1, 70523, null);

    expect(seasonRepository.create).toHaveBeenCalledTimes(1);
  });

  it('recusa data de conclusao no futuro', async () => {
    await expect(service.completeSerie(1, 70523, '2099-01-01')).rejects.toThrow(
      HttpException,
    );
  });

  it('completar nao e desfeito quando numberOfSeasons excede as temporadas da TMDB', async () => {
    serieRepository.findOne.mockResolvedValue({
      id: 9,
      idTmdb: 70523,
      completedAt: null,
      serie: { numberOfSeasons: 5 },
    });
    seasonRepository.find.mockResolvedValue([
      { seasonNumber: 1, episodeCount: 10 },
      { seasonNumber: 2, episodeCount: 8 },
    ]);

    const result = await service.completeSerie(1, 70523, null);

    expect(result.completedAt).not.toBeNull();
  });

  it('cria a linha watched_serie ao completar a serie quando o usuario e novo', async () => {
    serieRepository.findOne.mockResolvedValueOnce(null);

    await service.completeSerie(1, 70523, null);

    expect(serieRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 1 },
        idTmdb: 70523,
        watchedAt: null,
      }),
    );
    expect(serieRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ idTmdb: 70523, watchedAt: null }),
    );
  });

  it('desmarcar temporada limpa o completedAt de uma serie completa', async () => {
    serieRepository.findOne.mockResolvedValue({
      id: 9,
      idTmdb: 70523,
      completedAt: new Date('2025-01-05'),
      serie: { numberOfSeasons: 3 },
    });
    seasonRepository.find.mockResolvedValue([
      { seasonNumber: 1, episodeCount: 10 },
    ]);

    const result = await service.unmarkSeason(1, 70523, 2);

    expect(result.completedAt).toBeNull();
  });
});
