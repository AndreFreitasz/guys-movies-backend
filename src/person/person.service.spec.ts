import axios from 'axios';
import { PersonService } from './person.service';
import { GenreMapService } from './genre-map.service';

jest.mock('axios');

const mockedGet = axios.get as jest.Mock;

const genreMap = {
  resolve: jest.fn().mockResolvedValue({
    movie: new Map([[18, 'Drama']]),
    tv: new Map([[10767, 'Talk']]),
  }),
} as unknown as GenreMapService;

const tmdbPerson = {
  id: 31,
  name: 'Tom Hanks',
  biography: 'Ator estadunidense.',
  birthday: '1956-07-09',
  deathday: null,
  place_of_birth: 'Concord, California, USA',
  known_for_department: 'Acting',
  profile_path: '/face.jpg',
  combined_credits: {
    cast: [
      {
        id: 13,
        media_type: 'movie',
        title: 'Forrest Gump',
        character: 'Forrest Gump',
        release_date: '1994-07-06',
        vote_average: 8.5,
        vote_count: 30000,
        genre_ids: [18],
        poster_path: '/fg.jpg',
      },
      {
        id: 99,
        media_type: 'tv',
        name: 'Late Show',
        character: 'Self',
        first_air_date: '2015-09-08',
        vote_average: 6,
        vote_count: 100,
        genre_ids: [10767],
      },
    ],
    crew: [],
  },
};

describe('PersonService', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGet.mockResolvedValue({ data: tmdbPerson });
  });

  it('monta o perfil sem os creditos de ruido', async () => {
    const service = new PersonService(genreMap);

    const profile = await service.getProfile(31);

    expect(profile.name).toBe('Tom Hanks');
    expect(profile.stats.totalTitles).toBe(1);
    expect(profile.genres).toEqual([{ id: 18, name: 'Drama', count: 1 }]);
    expect(profile.departments).toEqual([
      { key: 'acting', label: 'Atuação', count: 1 },
    ]);
    expect(profile.defaultDepartment).toBe('acting');
    expect(profile.credits.items[0].title).toBe('Forrest Gump');
    expect(profile.highlights[0].title).toBe('Forrest Gump');
  });

  it('busca o TMDB uma vez por pessoa', async () => {
    const service = new PersonService(genreMap);

    await service.getProfile(31);
    await service.getCredits(31, { department: 'acting' });

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('cai para a bio em ingles quando a pt-BR vem vazia', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url.includes('language=en-US')) {
        return Promise.resolve({ data: { biography: 'American actor.' } });
      }
      return Promise.resolve({ data: { ...tmdbPerson, biography: '' } });
    });

    const service = new PersonService(genreMap);
    const profile = await service.getProfile(31);

    expect(profile.biography).toBe('American actor.');
    expect(profile.biographyLanguage).toBe('en');
  });

  it('estoura 404 quando o TMDB nao conhece a pessoa', async () => {
    mockedGet.mockResolvedValue({ data: { success: false } });

    const service = new PersonService(genreMap);

    await expect(service.getProfile(999999999)).rejects.toThrow();
  });
});
