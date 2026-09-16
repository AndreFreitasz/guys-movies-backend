import { buildSearchName } from './search-name';

describe('buildSearchName', () => {
  it('junta nome e nome de usuario', () => {
    expect(buildSearchName('Andre Freitas', 'dre')).toBe('andre freitas dre');
  });

  it('remove acentos', () => {
    expect(buildSearchName('André Luís', 'andre')).toBe('andre luis andre');
  });

  it('baixa a caixa', () => {
    expect(buildSearchName('ANDRE', 'DreFreitas')).toBe('andre drefreitas');
  });

  it('colapsa espacos repetidos e apara as pontas', () => {
    expect(buildSearchName('  Andre   Luis  ', ' dre ')).toBe(
      'andre luis dre',
    );
  });

  it('tolera nome nulo sem virar a string "null"', () => {
    expect(buildSearchName(null, 'dre')).toBe('dre');
  });

  it('tolera nome de usuario nulo', () => {
    expect(buildSearchName('Andre', null)).toBe('andre');
  });

  it('devolve string vazia quando nao ha nada', () => {
    expect(buildSearchName(null, null)).toBe('');
  });

  it('nao duplica quando nome e usuario sao iguais', () => {
    expect(buildSearchName('andre', 'andre')).toBe('andre');
  });
});
