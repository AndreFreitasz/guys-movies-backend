import { runWithConcurrency } from './run-with-concurrency';

describe('runWithConcurrency', () => {
  it('preserva a ordem dos resultados', async () => {
    const results = await runWithConcurrency([1, 2, 3, 4, 5], 2, async value => {
      await new Promise(resolve => setTimeout(resolve, (5 - value) * 5));
      return value * 10;
    });

    expect(results).toEqual([10, 20, 30, 40, 50]);
  });

  it('nunca ultrapassa o limite de execucoes simultaneas', async () => {
    let running = 0;
    let peak = 0;

    await runWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise(resolve => setTimeout(resolve, 5));
      running -= 1;
      return null;
    });

    expect(peak).toBe(4);
  });

  it('devolve lista vazia sem chamar o worker', async () => {
    const worker = jest.fn();
    const results = await runWithConcurrency([], 6, worker);

    expect(results).toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });

  it('nao trava quando o limite e maior que a lista', async () => {
    const results = await runWithConcurrency(['a', 'b'], 10, async value =>
      value.toUpperCase(),
    );

    expect(results).toEqual(['A', 'B']);
  });
});
