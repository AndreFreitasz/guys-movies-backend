import axios from 'axios';
import { RatingsService } from './ratings.service';

jest.mock('axios');

const mockedGet = axios.get as jest.Mock;

const omdbPayload = (ratings: { Source: string; Value: string }[]) => ({
  data: { Response: 'True', Ratings: ratings },
});

describe('RatingsService', () => {
  let service: RatingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OMDB_API_KEY = 'test-key';
    service = new RatingsService();
  });

  it('normaliza rotten tomatoes e metacritic', async () => {
    mockedGet.mockResolvedValue(
      omdbPayload([
        { Source: 'Internet Movie Database', Value: '7.6/10' },
        { Source: 'Rotten Tomatoes', Value: '85%' },
        { Source: 'Metacritic', Value: '67/100' },
      ]),
    );

    await expect(service.forImdbId('tt3896198')).resolves.toEqual({
      rottenTomatoes: 85,
      metacritic: 67,
    });
  });

  it('devolve null para a fonte ausente', async () => {
    mockedGet.mockResolvedValue(
      omdbPayload([{ Source: 'Rotten Tomatoes', Value: '96%' }]),
    );

    await expect(service.forImdbId('tt0903747')).resolves.toEqual({
      rottenTomatoes: 96,
      metacritic: null,
    });
  });

  it('trata Response False como ausencia de notas', async () => {
    mockedGet.mockResolvedValue({
      data: { Response: 'False', Error: 'Incorrect IMDb ID.' },
    });

    await expect(service.forImdbId('tt0000000')).resolves.toEqual({
      rottenTomatoes: null,
      metacritic: null,
    });
  });

  it('nao propaga falha de rede', async () => {
    mockedGet.mockRejectedValue(new Error('ECONNRESET'));

    await expect(service.forImdbId('tt3896198')).resolves.toEqual({
      rottenTomatoes: null,
      metacritic: null,
    });
  });

  it('nao chama a omdb sem chave configurada', async () => {
    delete process.env.OMDB_API_KEY;
    const withoutKey = new RatingsService();

    await expect(withoutKey.forImdbId('tt3896198')).resolves.toEqual({
      rottenTomatoes: null,
      metacritic: null,
    });
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('nao chama a omdb sem imdb id', async () => {
    await expect(service.forImdbId(null)).resolves.toEqual({
      rottenTomatoes: null,
      metacritic: null,
    });
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('usa o cache na segunda chamada', async () => {
    mockedGet.mockResolvedValue(
      omdbPayload([{ Source: 'Metacritic', Value: '74/100' }]),
    );

    await service.forImdbId('tt1');
    await service.forImdbId('tt1');

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });
});
