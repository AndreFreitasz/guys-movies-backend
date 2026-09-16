import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { WatchTogetherService } from './watch-together.service';
import { User } from '../users/entities/user.entity';
import { WatchedMovie } from '../movie/entities/watched-movie.entity';
import { WatchedSeason } from '../serie/entities/watched-season.entity';

describe('TimelineService', () => {
  let service: TimelineService;
  let userRepository: { findOne: jest.Mock };
  let watchedMovieRepository: { find: jest.Mock };
  let watchedSeasonRepository: { find: jest.Mock };

  beforeEach(async () => {
    userRepository = { findOne: jest.fn().mockResolvedValue({ id: 9 }) };
    watchedMovieRepository = { find: jest.fn().mockResolvedValue([]) };
    watchedSeasonRepository = { find: jest.fn().mockResolvedValue([]) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineService,
        {
          provide: WatchTogetherService,
          useValue: { companionsFor: jest.fn().mockResolvedValue(new Map()) },
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(WatchedMovie),
          useValue: watchedMovieRepository,
        },
        {
          provide: getRepositoryToken(WatchedSeason),
          useValue: watchedSeasonRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(TimelineService);
  });

  const movie = (id: number, watchedAt: string | null, title = 'Duna') => ({
    id,
    idTmdb: 100 + id,
    rating: 4.5,
    watchedAt,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    idMovie: { title, posterPath: 'https://cdn/p.jpg' },
  });

  const season = (id: number, watchedAt: string | null) => ({
    id,
    idTmdb: 200 + id,
    seasonNumber: 2,
    episodeCount: 10,
    watchedAt,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    serie: { name: 'Severance', posterPath: null },
  });

  it('estoura 404 quando o username nao existe', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.getTimeline('fantasma')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('mescla as duas fontes em ordem decrescente de data', async () => {
    watchedMovieRepository.find.mockResolvedValue([movie(1, '2026-03-12')]);
    watchedSeasonRepository.find.mockResolvedValue([season(1, '2026-03-20')]);

    const result = await service.getTimeline('andre');

    expect(result.events.map(event => event.occurredAt)).toEqual([
      '2026-03-20',
      '2026-03-12',
    ]);
    expect(result.events[0].kind).toBe('season');
  });

  it('usa createdAt quando watchedAt e nulo, em vez de afundar o item', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      { ...movie(1, null), createdAt: new Date('2026-04-01T00:00:00Z') },
      movie(2, '2026-01-05'),
    ]);

    const result = await service.getTimeline('andre');

    expect(result.events[0].occurredAt).toBe('2026-04-01');
  });

  it('omite evento cujo vinculo de midia e nulo', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      { ...movie(1, '2026-03-12'), idMovie: null },
      movie(2, '2026-03-11'),
    ]);

    const result = await service.getTimeline('andre');

    expect(result.events).toHaveLength(1);
    expect(result.events[0].idTmdb).toBe(102);
  });

  it('desempata pelo id quando varios eventos dividem a mesma data', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      movie(1, '2026-03-12'),
      movie(3, '2026-03-12'),
      movie(2, '2026-03-12'),
    ]);

    const result = await service.getTimeline('andre');

    expect(result.events.map(event => event.idTmdb)).toEqual([103, 102, 101]);
  });

  it('pagina sem pular nem repetir quando tudo divide a mesma data', async () => {
    const rows = [
      movie(1, '2026-03-12'),
      movie(2, '2026-03-12'),
      movie(3, '2026-03-12'),
    ];
    watchedMovieRepository.find.mockResolvedValue(rows);

    const first = await service.getTimeline('andre', undefined, 2);
    expect(first.events.map(event => event.idTmdb)).toEqual([103, 102]);
    expect(first.nextCursor).not.toBeNull();

    const second = await service.getTimeline(
      'andre',
      first.nextCursor as string,
      2,
    );
    expect(second.events.map(event => event.idTmdb)).toEqual([101]);
    expect(second.nextCursor).toBeNull();
  });

  it('pagina corretamente atravessando as duas fontes na mesma data', async () => {
    watchedMovieRepository.find.mockResolvedValue([movie(1, '2026-03-12')]);
    watchedSeasonRepository.find.mockResolvedValue([season(1, '2026-03-12')]);

    const first = await service.getTimeline('andre', undefined, 1);
    expect(first.events[0].kind).toBe('movie');

    const second = await service.getTimeline(
      'andre',
      first.nextCursor as string,
      1,
    );
    expect(second.events).toHaveLength(1);
    expect(second.events[0].kind).toBe('season');
  });

  it('ignora cursor corrompido e devolve a primeira pagina', async () => {
    watchedMovieRepository.find.mockResolvedValue([movie(1, '2026-03-12')]);

    const result = await service.getTimeline('andre', 'lixo!!!', 10);

    expect(result.events).toHaveLength(1);
  });

  it('monta a frase da temporada com numero e contagem de episodios', async () => {
    watchedSeasonRepository.find.mockResolvedValue([season(1, '2026-03-12')]);

    const result = await service.getTimeline('andre');

    expect(result.events[0]).toEqual({
      kind: 'season',
      idTmdb: 201,
      title: 'Severance',
      posterPath: null,
      seasonNumber: 2,
      episodeCount: 10,
      occurredAt: '2026-03-12',
        companions: [],
    });
  });

  it('passa order DESC para ambos repositorios', async () => {
    watchedMovieRepository.find.mockResolvedValue([]);
    watchedSeasonRepository.find.mockResolvedValue([]);

    await service.getTimeline('andre');

    expect(watchedMovieRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { watchedAt: 'DESC', id: 'DESC' },
      }),
    );
    expect(watchedSeasonRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { watchedAt: 'DESC', id: 'DESC' },
      }),
    );
  });

  it('filtra filmes pelo idUser do dono', async () => {
    userRepository.findOne.mockResolvedValue({ id: 42 });
    watchedMovieRepository.find.mockResolvedValue([]);
    watchedSeasonRepository.find.mockResolvedValue([]);

    await service.getTimeline('andre');

    expect(watchedMovieRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idUser: { id: 42 } },
      }),
    );
  });

  it('filtra temporadas pelo user do dono', async () => {
    userRepository.findOne.mockResolvedValue({ id: 42 });
    watchedMovieRepository.find.mockResolvedValue([]);
    watchedSeasonRepository.find.mockResolvedValue([]);

    await service.getTimeline('andre');

    expect(watchedSeasonRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { id: 42 } },
      }),
    );
  });

  it('resolve page size para 20 quando limit nao e fornecido', async () => {
    const manyMovies = Array.from({ length: 25 }, (_, i) =>
      movie(i + 1, '2026-03-12'),
    );
    watchedMovieRepository.find.mockResolvedValue(manyMovies);

    const result = await service.getTimeline('andre');

    expect(result.events).toHaveLength(20);
  });

  it('resolve page size para 50 quando limit ultrapassa MAX_PAGE_SIZE', async () => {
    const manyMovies = Array.from({ length: 100 }, (_, i) =>
      movie(i + 1, '2026-03-12'),
    );
    watchedMovieRepository.find.mockResolvedValue(manyMovies);

    const result = await service.getTimeline('andre', undefined, 100);

    expect(result.events).toHaveLength(50);
  });

  it('resolve page size para 20 quando limit nao e numero inteiro', async () => {
    const manyMovies = Array.from({ length: 25 }, (_, i) =>
      movie(i + 1, '2026-03-12'),
    );
    watchedMovieRepository.find.mockResolvedValue(manyMovies);

    const result = await service.getTimeline('andre', undefined, 3.5 as any);

    expect(result.events).toHaveLength(20);
  });

  it('monta evento de filme completo com rating nulo', async () => {
    watchedMovieRepository.find.mockResolvedValue([
      { ...movie(1, '2026-03-12'), rating: null },
    ]);

    const result = await service.getTimeline('andre');

    expect(result.events[0]).toEqual({
      kind: 'movie',
      idTmdb: 101,
      title: 'Duna',
      posterPath: 'https://cdn/p.jpg',
      rating: null,
      occurredAt: '2026-03-12',
        companions: [],
    });
  });
});
