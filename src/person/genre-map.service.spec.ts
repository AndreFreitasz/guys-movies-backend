import axios from 'axios';
import { GenreMapService } from './genre-map.service';

jest.mock('axios');

const mockedGet = axios.get as jest.Mock;

describe('GenreMapService', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGet.mockImplementation((url: string) =>
      Promise.resolve({
        data: {
          genres: url.includes('/genre/movie/list')
            ? [{ id: 18, name: 'Drama' }]
            : [{ id: 10767, name: 'Talk' }],
        },
      }),
    );
  });

  it('separa os mapas de filme e serie', async () => {
    const service = new GenreMapService();
    const map = await service.resolve();

    expect(map.movie.get(18)).toBe('Drama');
    expect(map.tv.get(10767)).toBe('Talk');
    expect(map.movie.get(10767)).toBeUndefined();
  });

  it('busca uma vez so e reaproveita o cache', async () => {
    const service = new GenreMapService();
    await service.resolve();
    await service.resolve();

    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});
