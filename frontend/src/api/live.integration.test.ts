// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { evaluate } from '../calculator/evaluate';
import { parse } from '../calculator/parser';
import { tokens } from '../test/tokens';
import { ApiError, createCalculatorApi } from './calculatorApi';

// Runs expressions against a running calculate service. Skipped unless the
// address is given:
//
//   CALC_SERVICE_URL=http://localhost:8080 npm test

const serviceUrl = process.env.CALC_SERVICE_URL;

describe.skipIf(!serviceUrl)('against the running service', () => {
  const api = createCalculatorApi(serviceUrl ?? '');
  const run = (keys: string) => evaluate(parse(tokens(keys)), api);

  it.each([
    ['AC-013', '2+3', 5],
    ['AC-015', '10-3-2', 5],
    ['AC-016', '2+3*4', 14],
    ['AC-018', '100/5/2', 10],
    ['AC-019', '2^3^2', 512],
    ['AC-020', 'r(9+7)', 4],
    ['AC-021', '25%200', 12.5],
    ['AC-022', '(2+3)*4', 20],
    ['AC-023', '-2^2', -4],
    ['AC-058', '10-4/2', 8],
    ['AC-058', '8/2*4', 16],
    ['AC-058', '2*3^2', 18],
    ['AC-058', '(-3)^2', 9],
    ['AC-058', '2*(3+(4-1)*2)', 18],
    ['AC-058', '1+2*3-4/2', 5],
    ['AC-058', '100-2^3*5+r81/3', 63],
    ['AC-058', '50+25%200', 62.5],
  ])('%s evaluates %s', async (_id, keys, result) => {
    expect(await run(keys)).toBe(result);
  });

  it.each([
    ['AC-034', '10/0', 'DIVISION_BY_ZERO'],
    ['AC-035', 'r-4', 'NEGATIVE_SQUARE_ROOT'],
    ['AC-036', '(-8)^0.5', 'UNDEFINED_RESULT'],
    ['AC-036', '10^400', 'RESULT_OUT_OF_RANGE'],
  ])('%s fails %s with %s', async (_id, keys, code) => {
    const failure = run(keys);
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ code });
  });
});
