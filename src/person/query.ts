import {
  MediaType,
  PersonCredit,
  PersonCreditsPage,
} from './interfaces/person.interface';

export const PAGE_SIZE = 20;

const MIN_VOTES_FOR_HIGHLIGHT = 200;
const DEFAULT_HIGHLIGHTS = 6;

export type CreditSort = 'relevance' | 'year' | 'rating';

export interface CreditQuery {
  department?: string;
  media?: MediaType | 'all';
  genre?: number;
  sort?: CreditSort;
  page?: number;
}

export const relevanceScore = (credit: PersonCredit): number =>
  (credit.voteAverage ?? 0) * Math.log10(credit.voteCount + 1);

const compare = (sort: CreditSort) => {
  if (sort === 'year') {
    return (left: PersonCredit, right: PersonCredit) =>
      (right.year ?? 0) - (left.year ?? 0);
  }

  if (sort === 'rating') {
    return (left: PersonCredit, right: PersonCredit) =>
      (right.voteAverage ?? 0) - (left.voteAverage ?? 0);
  }

  return (left: PersonCredit, right: PersonCredit) =>
    relevanceScore(right) - relevanceScore(left);
};

export const queryCredits = (
  credits: PersonCredit[],
  query: CreditQuery,
): PersonCreditsPage => {
  const media = query.media ?? 'all';
  const page = Math.max(1, Math.trunc(query.page ?? 1) || 1);

  const filtered = credits.filter((credit) => {
    if (query.department && credit.department !== query.department) return false;
    if (media !== 'all' && credit.mediaType !== media) return false;
    if (query.genre && !credit.genreIds.includes(query.genre)) return false;
    return true;
  });

  filtered.sort(compare(query.sort ?? 'relevance'));

  const start = (page - 1) * PAGE_SIZE;

  return {
    items: filtered.slice(start, start + PAGE_SIZE),
    page,
    total: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
  };
};

export const pickHighlights = (
  credits: PersonCredit[],
  limit = DEFAULT_HIGHLIGHTS,
): PersonCredit[] => {
  const byTitle = new Map<string, PersonCredit>();

  for (const credit of credits) {
    const key = `${credit.mediaType}:${credit.id}`;
    const current = byTitle.get(key);
    if (!current || relevanceScore(credit) > relevanceScore(current)) {
      byTitle.set(key, credit);
    }
  }

  const unique = [...byTitle.values()].sort(
    (left, right) => relevanceScore(right) - relevanceScore(left),
  );

  const popular = unique.filter(
    (credit) => credit.voteCount >= MIN_VOTES_FOR_HIGHLIGHT,
  );

  return (popular.length ? popular : unique).slice(0, limit);
};
