import { pickHighlights, queryCredits, relevanceScore } from './query';
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

describe('relevanceScore', () => {
  it('poe Forrest Gump acima de uma serie longeva com nota parecida', () => {
    const forrest = credit({ voteAverage: 8.462, voteCount: 30708 });
    const simpsons = credit({ voteAverage: 8, voteCount: 11088 });

    expect(relevanceScore(forrest)).toBeGreaterThan(relevanceScore(simpsons));
  });

  it('nao quebra com zero votos', () => {
    expect(relevanceScore(credit({ voteAverage: null, voteCount: 0 }))).toBe(0);
  });
});

describe('queryCredits', () => {
  const credits = [
    credit({ id: 1, year: 1994, voteAverage: 8.5, voteCount: 30000, genreIds: [18] }),
    credit({ id: 2, year: 2020, voteAverage: 6.0, voteCount: 800, genreIds: [35] }),
    credit({ id: 3, mediaType: 'tv', year: 2001, voteAverage: 8.6, voteCount: 5000, genreIds: [18] }),
    credit({ id: 4, department: 'directing', year: 2010, voteCount: 400 }),
  ];

  it('filtra por departamento', () => {
    const page = queryCredits(credits, { department: 'directing' });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].id).toBe(4);
  });

  it('filtra por midia', () => {
    const page = queryCredits(credits, { department: 'acting', media: 'tv' });

    expect(page.items.map((item) => item.id)).toEqual([3]);
  });

  it('filtra por genero', () => {
    const page = queryCredits(credits, { department: 'acting', genre: 35 });

    expect(page.items.map((item) => item.id)).toEqual([2]);
  });

  it('ordena por relevancia por padrao', () => {
    const page = queryCredits(credits, { department: 'acting' });

    expect(page.items[0].id).toBe(1);
  });

  it('ordena por ano decrescente', () => {
    const page = queryCredits(credits, { department: 'acting', sort: 'year' });

    expect(page.items.map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it('ordena por nota', () => {
    const page = queryCredits(credits, { department: 'acting', sort: 'rating' });

    expect(page.items[0].id).toBe(3);
  });

  it('pagina e informa o total', () => {
    const many = Array.from({ length: 45 }, (_, index) =>
      credit({ id: index + 1, voteCount: 45 - index }),
    );

    const page = queryCredits(many, { department: 'acting', page: 2 });

    expect(page.items).toHaveLength(20);
    expect(page.page).toBe(2);
    expect(page.total).toBe(45);
    expect(page.totalPages).toBe(3);
  });

  it('devolve pagina vazia quando pedem alem do fim', () => {
    const page = queryCredits(credits, { department: 'acting', page: 99 });

    expect(page.items).toEqual([]);
    expect(page.page).toBe(99);
  });
});

describe('pickHighlights', () => {
  it('exige votos minimos e devolve os mais relevantes', () => {
    const credits = [
      credit({ id: 1, voteAverage: 9.9, voteCount: 10 }),
      credit({ id: 2, voteAverage: 8.5, voteCount: 30000 }),
      credit({ id: 3, voteAverage: 8.4, voteCount: 20000 }),
    ];

    const highlights = pickHighlights(credits, 2);

    expect(highlights.map((item) => item.id)).toEqual([2, 3]);
  });

  it('nao repete o mesmo titulo vindo de departamentos diferentes', () => {
    const credits = [
      credit({ id: 7, department: 'acting', voteCount: 9000 }),
      credit({ id: 7, department: 'directing', voteCount: 9000 }),
    ];

    expect(pickHighlights(credits, 6)).toHaveLength(1);
  });

  it('relaxa o piso de votos quando a pessoa nao tem titulo popular', () => {
    const credits = [credit({ id: 1, voteAverage: 7, voteCount: 12 })];

    expect(pickHighlights(credits, 6)).toHaveLength(1);
  });
});
