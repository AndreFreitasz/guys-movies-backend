import { encodeCursor, decodeCursor, encodeOffsetCursor, decodeOffsetCursor } from './cursor';

describe('cursor', () => {
  it('faz round trip preservando os tres campos', () => {
    const parts = { occurredAt: '2026-03-12', rank: 1, id: 87 };
    expect(decodeCursor(encodeCursor(parts))).toEqual(parts);
  });

  it('devolve null para cursor ausente', () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });

  it('devolve null para cursor corrompido em vez de estourar', () => {
    expect(decodeCursor('nao-e-base64-valido!!')).toBeNull();
    expect(
      decodeCursor(Buffer.from('so|duas').toString('base64url')),
    ).toBeNull();
    expect(
      decodeCursor(Buffer.from('2026-03-12|x|9').toString('base64url')),
    ).toBeNull();
  });

  it('nao vaza caractere que quebre querystring', () => {
    const encoded = encodeCursor({ occurredAt: '2026-03-12', rank: 0, id: 1 });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('cursor de offset', () => {
  it('codifica e decodifica o offset', () => {
    const raw = encodeOffsetCursor(40);
    expect(raw).not.toContain('40');
    expect(decodeOffsetCursor(raw)).toBe(40);
  });

  it('aceita offset zero', () => {
    expect(decodeOffsetCursor(encodeOffsetCursor(0))).toBe(0);
  });

  it('devolve nulo para cursor ausente', () => {
    expect(decodeOffsetCursor(undefined)).toBeNull();
  });

  it('devolve nulo para cursor corrompido', () => {
    expect(decodeOffsetCursor('nao-e-base64-valido!!')).toBeNull();
  });

  it('devolve nulo para offset negativo', () => {
    expect(decodeOffsetCursor(encodeOffsetCursor(-5))).toBeNull();
  });

  it('nao confunde com o cursor de keyset', () => {
    const keyset = encodeCursor({
      occurredAt: '2026-09-15T00:00:00.000Z',
      rank: 0,
      id: 7,
    });
    expect(decodeOffsetCursor(keyset)).toBeNull();
  });
});
