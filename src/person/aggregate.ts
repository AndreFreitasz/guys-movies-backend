import { departmentLabel, departmentSlug } from './credits';
import { GenreMap } from './genre-map.service';
import {
  DepartmentSummary,
  GenreCount,
  PersonCredit,
  PersonStats,
} from './interfaces/person.interface';

const MIN_VOTES_FOR_BEST = 500;

export const summarizeDepartments = (
  credits: PersonCredit[],
): DepartmentSummary[] => {
  const counts = new Map<string, number>();

  for (const credit of credits) {
    counts.set(credit.department, (counts.get(credit.department) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: departmentLabel(key), count }))
    .sort((left, right) => right.count - left.count);
};

export const countGenres = (
  credits: PersonCredit[],
  map: GenreMap,
): GenreCount[] => {
  const counts = new Map<number, { name: string; count: number }>();

  for (const credit of credits) {
    const names = credit.mediaType === 'tv' ? map.tv : map.movie;

    for (const id of credit.genreIds) {
      const name = names.get(id);
      if (!name) continue;

      const current = counts.get(id);
      if (current) current.count += 1;
      else counts.set(id, { name, count: 1 });
    }
  }

  return [...counts.entries()]
    .map(([id, value]) => ({ id, name: value.name, count: value.count }))
    .sort((left, right) => right.count - left.count);
};

export const buildStats = (
  credits: PersonCredit[],
  genres: GenreCount[],
): PersonStats => {
  const years = credits
    .map((credit) => credit.year)
    .filter((year): year is number => year !== null);

  const bestRated = credits
    .filter(
      (credit) =>
        credit.voteCount >= MIN_VOTES_FOR_BEST && credit.voteAverage !== null,
    )
    .sort((left, right) => (right.voteAverage ?? 0) - (left.voteAverage ?? 0))[0];

  const uniqueTitles = new Set(
    credits.map((credit) => `${credit.mediaType}:${credit.id}`),
  );

  return {
    totalTitles: uniqueTitles.size,
    firstYear: years.length ? Math.min(...years) : null,
    lastYear: years.length ? Math.max(...years) : null,
    topGenre: genres[0]?.name ?? null,
    bestRated: bestRated ?? null,
  };
};

export const pickDefaultDepartment = (
  departments: DepartmentSummary[],
  knownForDepartment: string | null,
): string => {
  if (!departments.length) return 'acting';

  const preferred = departmentSlug(knownForDepartment ?? '');
  const match = departments.find((department) => department.key === preferred);

  return match ? match.key : departments[0].key;
};
