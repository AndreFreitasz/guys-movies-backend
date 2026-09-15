import { encodeCursor, decodeCursor } from './cursor';

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
