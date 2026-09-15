export interface CursorParts {
  occurredAt: string;
  rank: number;
  id: number;
}

const SEPARATOR = '|';

export const encodeCursor = (parts: CursorParts): string =>
  Buffer.from(
    [parts.occurredAt, parts.rank, parts.id].join(SEPARATOR),
  ).toString('base64url');

export const decodeCursor = (raw: string | undefined): CursorParts | null => {
  if (!raw) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(raw, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const segments = decoded.split(SEPARATOR);
  if (segments.length !== 3) return null;

  const [occurredAt, rawRank, rawId] = segments;
  const rank = Number.parseInt(rawRank, 10);
  const id = Number.parseInt(rawId, 10);

  if (!Number.isInteger(rank) || !Number.isInteger(id)) return null;
  if (occurredAt.length === 0) return null;

  return { occurredAt, rank, id };
};
