export interface CursorParts {
  occurredAt: string;
  rank: number;
  id: number;
}

const SEPARATOR = '|';
const OFFSET_PREFIX = 'offset:';

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

export const encodeOffsetCursor = (offset: number): string =>
  Buffer.from(`${OFFSET_PREFIX}${offset}`).toString('base64url');

export const decodeOffsetCursor = (raw: string | undefined): number | null => {
  if (!raw) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(raw, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  if (!decoded.startsWith(OFFSET_PREFIX)) return null;

  const offset = Number.parseInt(decoded.slice(OFFSET_PREFIX.length), 10);

  if (!Number.isInteger(offset) || offset < 0) return null;

  return offset;
};
