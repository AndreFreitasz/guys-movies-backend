export const normalizeForMatch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const WORD_CHARACTER_CLASS = 'a-z0-9';
const WORD_CHAR_REGEX = new RegExp(`[${WORD_CHARACTER_CLASS}]`);
const NON_WORD_CHAR_CLASS = `[^${WORD_CHARACTER_CLASS}]`;

const isWordChar = (character: string): boolean =>
  WORD_CHAR_REGEX.test(character);

export const matchLayer = (title: string, query: string): number => {
  const normalizedTitle = normalizeForMatch(title ?? '');
  const normalizedQuery = normalizeForMatch(query ?? '');

  if (normalizedQuery.length === 0) return 5;
  if (normalizedTitle === normalizedQuery) return 1;

  if (normalizedTitle.startsWith(normalizedQuery)) {
    const boundaryChar = normalizedTitle.charAt(normalizedQuery.length);
    if (boundaryChar === '' || !isWordChar(boundaryChar)) return 2;
  }

  const wordBoundary = new RegExp(
    `(^|${NON_WORD_CHAR_CLASS})${escapeRegExp(normalizedQuery)}($|${NON_WORD_CHAR_CLASS})`,
  );
  if (wordBoundary.test(normalizedTitle)) return 3;

  if (normalizedTitle.includes(normalizedQuery)) return 4;

  return 5;
};
