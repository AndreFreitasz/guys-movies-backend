import { normalizeForMatch } from '../search/relevance';

export const buildSearchName = (
  name: string | null | undefined,
  username: string | null | undefined,
): string => {
  const parts = [name ?? '', username ?? '']
    .map(part => normalizeForMatch(part))
    .filter(part => part.length > 0);

  const unique = parts.filter(
    (part, index) => parts.indexOf(part) === index,
  );

  return unique.join(' ');
};
