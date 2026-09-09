import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { MoviesService } from '../movies/movies.service';
import { SeriesService } from '../series/series.service';

describe('SearchService', () => {
  let service: SearchService;
  let moviesService: { searchMovies: jest.Mock };
  let seriesService: { searchSeries: jest.Mock };

  beforeEach(async () => {
    moviesService = { searchMovies: jest.fn() };
    seriesService = { searchSeries: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: MoviesService, useValue: moviesService },
        { provide: SeriesService, useValue: seriesService },
      ],
    }).compile();

    service = moduleRef.get(SearchService);
  });

  it('titulo exato vence um resultado mais popular', async () => {
    moviesService.searchMovies.mockResolvedValue([
      {
        id: 1,
        title: 'Duna: Parte Dois',
        overview: '',
        poster_url: '',
        vote_average: 8,
        release_date: '2024-03-01',
        popularity: 900,
        original_language: 'en',
      },
      {
        id: 2,
        title: 'Duna',
        overview: '',
        poster_url: '',
        vote_average: 8,
        release_date: '2021-10-21',
        popularity: 100,
        original_language: 'en',
      },
    ]);
    seriesService.searchSeries.mockResolvedValue([]);

    const result = await service.searchAll('duna');

    expect(result.map(item => item.id)).toEqual([2, 1]);
  });

  it('popularidade desempata dentro da mesma camada', async () => {
    moviesService.searchMovies.mockResolvedValue([
      {
        id: 1,
        title: 'Duna: Parte Um',
        overview: '',
        poster_url: '',
        vote_average: 8,
        release_date: '2021-10-21',
        popularity: 100,
        original_language: 'en',
      },
      {
        id: 2,
        title: 'Duna: Parte Dois',
        overview: '',
        poster_url: '',
        vote_average: 8,
        release_date: '2024-03-01',
        popularity: 900,
        original_language: 'en',
      },
    ]);
    seriesService.searchSeries.mockResolvedValue([]);

    const result = await service.searchAll('duna');

    expect(result.map(item => item.id)).toEqual([2, 1]);
  });

  it('termo vazio nao chama a tmdb', async () => {
    const result = await service.searchAll('   ');

    expect(result).toEqual([]);
    expect(moviesService.searchMovies).not.toHaveBeenCalled();
    expect(seriesService.searchSeries).not.toHaveBeenCalled();
  });
});
