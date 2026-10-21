import {
  buildStats,
  countGenres,
  pickDefaultDepartment,
  summarizeDepartments,
} from './aggregate';
import { GenreMap } from './genre-map.service';
import { PersonCredit } from './interfaces/person.interface';

const credit = (over: Partial<PersonCredit>): PersonCredit => ({
  id: 1,
  mediaType: 'movie',
  title: 'Filme',
  posterUrl: null,
  year: 2000,
  voteAverage: 7,
  voteCount: 1000,
  genreIds: [18],
  role: 'Alguem',
  department: 'acting',
  ...over,
});

const map: GenreMap = {
  movie: new Map([
    [18, 'Drama'],
    [35, 'Comédia'],
  ]),
  tv: new Map([
    [18, 'Drama'],
    [10759, 'Ação e Aventura'],
  ]),
};

describe('summarizeDepartments', () => {
  it('conta e ordena por volume, com rotulo em portugues', () => {
    const result = summarizeDepartments([
      credit({ department: 'acting' }),
      credit({ id: 2, department: 'acting' }),
      credit({ id: 3, department: 'directing' }),
    ]);

    expect(result).toEqual([
      { key: 'acting', label: 'Atuação', count: 2 },
      { key: 'directing', label: 'Direção', count: 1 },
    ]);
  });

  it('nao devolve departamento vazio', () => {
    expect(summarizeDepartments([])).toEqual([]);
  });
});

describe('countGenres', () => {
  it('resolve o nome pelo media_type do credito', () => {
    const result = countGenres(
      [
        credit({ mediaType: 'movie', genreIds: [18] }),
        credit({ id: 2, mediaType: 'tv', genreIds: [10759] }),
      ],
      map,
    );

    expect(result).toEqual([
      { id: 18, name: 'Drama', count: 1 },
      { id: 10759, name: 'Ação e Aventura', count: 1 },
    ]);
  });

  it('ordena por contagem decrescente', () => {
    const result = countGenres(
      [
        credit({ genreIds: [18] }),
        credit({ id: 2, genreIds: [18] }),
        credit({ id: 3, genreIds: [35] }),
      ],
      map,
    );

    expect(result[0]).toEqual({ id: 18, name: 'Drama', count: 2 });
  });

  it('ignora genero sem nome no mapa', () => {
    expect(countGenres([credit({ genreIds: [999] })], map)).toEqual([]);
  });
});

describe('buildStats', () => {
  it('resume total, anos, genero principal e melhor avaliado', () => {
    const credits = [
      credit({ id: 1, year: 1994, voteAverage: 8.5, voteCount: 30000 }),
      credit({ id: 2, year: 2020, voteAverage: 6.1, voteCount: 900 }),
    ];
    const genres = countGenres(credits, map);

    const stats = buildStats(credits, genres);

    expect(stats.totalTitles).toBe(2);
    expect(stats.firstYear).toBe(1994);
    expect(stats.lastYear).toBe(2020);
    expect(stats.topGenre).toBe('Drama');
    expect(stats.bestRated?.id).toBe(1);
  });

  it('ignora titulo com poucos votos ao escolher o melhor avaliado', () => {
    const credits = [
      credit({ id: 1, voteAverage: 9.9, voteCount: 3 }),
      credit({ id: 2, voteAverage: 8.0, voteCount: 5000 }),
    ];

    expect(buildStats(credits, []).bestRated?.id).toBe(2);
  });

  it('aceita filmografia vazia', () => {
    expect(buildStats([], [])).toEqual({
      totalTitles: 0,
      firstYear: null,
      lastYear: null,
      topGenre: null,
      bestRated: null,
    });
  });
});

describe('pickDefaultDepartment', () => {
  const departments = [
    { key: 'production', label: 'Produção', count: 60 },
    { key: 'acting', label: 'Atuação', count: 20 },
  ];

  it('prefere o departamento principal da pessoa', () => {
    expect(pickDefaultDepartment(departments, 'Acting')).toBe('acting');
  });

  it('cai no de maior volume quando o principal nao tem creditos', () => {
    expect(pickDefaultDepartment(departments, 'Sound')).toBe('production');
  });

  it('devolve acting quando nao ha departamento algum', () => {
    expect(pickDefaultDepartment([], null)).toBe('acting');
  });
});
