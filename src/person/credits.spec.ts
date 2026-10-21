import {
  dropImplausibleCredits,
  isNoiseCredit,
  normalizeCredits,
  departmentSlug,
} from './credits';
import { PersonCredit, RawCredit } from './interfaces/person.interface';

const base: RawCredit = {
  id: 1,
  media_type: 'movie',
  title: 'Forrest Gump',
  character: 'Forrest Gump',
  release_date: '1994-07-06',
  vote_average: 8.462,
  vote_count: 30708,
  genre_ids: [18, 10749],
  poster_path: '/abc.jpg',
};

describe('isNoiseCredit', () => {
  it('descarta participacao como a propria pessoa', () => {
    expect(isNoiseCredit({ ...base, character: 'Self' })).toBe(true);
    expect(isNoiseCredit({ ...base, character: 'Self - Guest' })).toBe(true);
    expect(isNoiseCredit({ ...base, character: 'Himself' })).toBe(true);
    expect(isNoiseCredit({ ...base, character: 'Herself' })).toBe(true);
  });

  it('mantem personagem cujo nome apenas comeca com as mesmas letras', () => {
    expect(isNoiseCredit({ ...base, character: 'Selfridge' })).toBe(false);
  });

  it('descarta tv de talk, news e reality', () => {
    const talk: RawCredit = { ...base, media_type: 'tv', genre_ids: [10767] };
    const news: RawCredit = { ...base, media_type: 'tv', genre_ids: [10763] };
    const reality: RawCredit = { ...base, media_type: 'tv', genre_ids: [10764] };
    expect(isNoiseCredit(talk)).toBe(true);
    expect(isNoiseCredit(news)).toBe(true);
    expect(isNoiseCredit(reality)).toBe(true);
  });

  it('mantem documentario, que e obra legitima', () => {
    expect(isNoiseCredit({ ...base, genre_ids: [99] })).toBe(false);
    expect(isNoiseCredit({ ...base, media_type: 'tv', genre_ids: [99] })).toBe(
      false,
    );
  });

  it('mantem filme mesmo que o id de genero coincida com um de tv', () => {
    expect(
      isNoiseCredit({ ...base, media_type: 'movie', genre_ids: [10767] }),
    ).toBe(false);
  });
});

describe('departmentSlug', () => {
  it('traduz os departamentos conhecidos', () => {
    expect(departmentSlug('Directing')).toBe('directing');
    expect(departmentSlug('Costume & Make-Up')).toBe('costume-make-up');
  });
});

describe('normalizeCredits', () => {
  it('normaliza elenco com o personagem como papel', () => {
    const [credit] = normalizeCredits([base], []);

    expect(credit).toEqual({
      id: 1,
      mediaType: 'movie',
      title: 'Forrest Gump',
      posterPath: '/abc.jpg',
      year: 1994,
      voteAverage: 8.462,
      voteCount: 30708,
      genreIds: [18, 10749],
      role: 'Forrest Gump',
      department: 'acting',
    });
  });

  it('usa name e first_air_date para series', () => {
    const serie: RawCredit = {
      id: 2,
      media_type: 'tv',
      name: 'Band of Brothers',
      character: 'Narrator',
      first_air_date: '2001-09-09',
      genre_ids: [18],
    };

    const [credit] = normalizeCredits([serie], []);

    expect(credit.title).toBe('Band of Brothers');
    expect(credit.year).toBe(2001);
  });

  it('usa o job como papel na equipe', () => {
    const crew: RawCredit = {
      ...base,
      character: undefined,
      job: 'Director',
      department: 'Directing',
    };

    const [credit] = normalizeCredits([], [crew]);

    expect(credit.role).toBe('Director');
    expect(credit.department).toBe('directing');
  });

  it('deduplica o mesmo titulo com o mesmo papel no mesmo departamento', () => {
    const crew: RawCredit = {
      ...base,
      character: undefined,
      job: 'Producer',
      department: 'Production',
    };

    expect(normalizeCredits([], [crew, { ...crew }])).toHaveLength(1);
  });

  it('mantem o mesmo titulo em departamentos diferentes', () => {
    const crew: RawCredit = {
      ...base,
      character: undefined,
      job: 'Director',
      department: 'Directing',
    };

    const credits = normalizeCredits([base], [crew]);

    expect(credits).toHaveLength(2);
    expect(credits.map((credit) => credit.department).sort()).toEqual([
      'acting',
      'directing',
    ]);
  });

  it('descarta ruido e aceita poster ausente', () => {
    const noise: RawCredit = { ...base, id: 9, character: 'Self' };
    const noPoster: RawCredit = { ...base, id: 10, poster_path: null };

    const credits = normalizeCredits([noise, noPoster], []);

    expect(credits).toHaveLength(1);
    expect(credits[0].posterPath).toBeNull();
  });

  it('aceita data vazia sem quebrar', () => {
    const credits = normalizeCredits([{ ...base, release_date: '' }], []);

    expect(credits[0].year).toBeNull();
  });
});

describe('dropImplausibleCredits', () => {
  const credit = (over: Partial<PersonCredit>): PersonCredit => ({
    id: 1,
    mediaType: 'movie',
    title: 'Filme',
    posterPath: null,
    year: 2000,
    voteAverage: null,
    voteCount: 0,
    genreIds: [],
    role: 'Alguem',
    department: 'acting',
    ...over,
  });

  it('descarta credito datado antes do nascimento', () => {
    const credits = [credit({ id: 1, year: 1953 }), credit({ id: 2, year: 1980 })];

    expect(dropImplausibleCredits(credits, 1956)).toEqual([
      credit({ id: 2, year: 1980 }),
    ]);
  });

  it('mantem credito sem ano mesmo com birthYear definido', () => {
    const credits = [credit({ id: 1, year: null })];

    expect(dropImplausibleCredits(credits, 1956)).toEqual(credits);
  });

  it('mantem tudo quando birthYear e nulo', () => {
    const credits = [credit({ id: 1, year: 1953 }), credit({ id: 2, year: 1980 })];

    expect(dropImplausibleCredits(credits, null)).toEqual(credits);
  });
});
