import { matchLayer, normalizeForMatch } from './relevance';

describe('normalizeForMatch', () => {
  it('remove acentos e caixa', () => {
    expect(normalizeForMatch('Amélie')).toBe('amelie');
    expect(normalizeForMatch('TRÊS')).toBe('tres');
  });

  it('colapsa espacos repetidos e apara as bordas', () => {
    expect(normalizeForMatch('  o   senhor  ')).toBe('o senhor');
  });
});

describe('matchLayer', () => {
  it('camada 1 para titulo identico', () => {
    expect(matchLayer('Duna', 'duna')).toBe(1);
  });

  it('camada 1 ignorando acento e caixa', () => {
    expect(matchLayer('Amélie', 'AMELIE')).toBe(1);
  });

  it('camada 2 para titulo que comeca com o termo', () => {
    expect(matchLayer('Duna: Parte Dois', 'duna')).toBe(2);
  });

  it('camada 3 para o termo como palavra inteira', () => {
    expect(matchLayer('A Herança de Duna', 'duna')).toBe(3);
  });

  it('camada 3 para o termo entre parenteses', () => {
    expect(matchLayer('A Origem (Duna)', 'duna')).toBe(3);
  });

  it('camada 3 para o termo precedido de virgula colada', () => {
    expect(matchLayer('Ação,Duna e Aventura', 'duna')).toBe(3);
  });

  it('camada 3 para o termo seguido de exclamacao', () => {
    expect(matchLayer('Bem-vinda, Duna!', 'duna')).toBe(3);
  });

  it('camada 4 para o termo colado em outra palavra', () => {
    expect(matchLayer('Dunas do Tempo', 'duna')).toBe(4);
  });

  it('camada 5 quando o titulo nao contem o termo', () => {
    expect(matchLayer('Blade Runner', 'duna')).toBe(5);
  });

  it('item que casa em duas camadas entra na menor', () => {
    expect(matchLayer('Duna Duna', 'duna')).toBe(2);
  });
});
