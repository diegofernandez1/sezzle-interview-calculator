import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/calculatorApi';
import { createFakeService } from '../test/fakeService';
import { tokens } from '../test/tokens';
import { evaluate } from './evaluate';
import { parse } from './parser';

// Each case types an expression, evaluates it against the fake service, and
// checks the result and the calls the service received, in order.

async function run(keys: string) {
  const { api, calls } = createFakeService();
  const result = await evaluate(parse(tokens(keys)), api);
  return { result, calls };
}

describe('evaluate', () => {
  it.each([
    ['AC-013', '2+3', 5, [['add', [2, 3]]]],
    ['AC-014', '1+2+3', 6, [['add', [1, 2, 3]]]],
    ['AC-015', '10-3-2', 5, [['subtract', [10, 3, 2]]]],
    [
      'AC-016',
      '2+3*4',
      14,
      [
        ['multiply', [3, 4]],
        ['add', [2, 12]],
      ],
    ],
    [
      'AC-017',
      '10-3+2',
      9,
      [
        ['subtract', [10, 3]],
        ['add', [7, 2]],
      ],
    ],
    ['AC-018', '100/5/2', 10, [['divide', [100, 5, 2]]]],
    ['AC-018', '2*3*4', 24, [['multiply', [2, 3, 4]]]],
    [
      'AC-019',
      '2^3^2',
      512,
      [
        ['exponent', 3, 2],
        ['exponent', 2, 9],
      ],
    ],
    ['AC-020', 'r9', 3, [['squareRoot', 9]]],
    [
      'AC-020',
      'r(9+7)',
      4,
      [
        ['add', [9, 7]],
        ['squareRoot', 16],
      ],
    ],
    ['AC-021', '25%200', 12.5, [['percentage', 25, 200]]],
    [
      'AC-022',
      '(2+3)*4',
      20,
      [
        ['add', [2, 3]],
        ['multiply', [5, 4]],
      ],
    ],
    [
      'AC-023',
      '-2^2',
      -4,
      [
        ['exponent', 2, 2],
        ['multiply', [-1, 4]],
      ],
    ],
    ['AC-023', '2*-3', -6, [['multiply', [2, -3]]]],
    ['AC-024', '(2+3', 5, [['add', [2, 3]]]],
    ['AC-025', '5', 5, []],
    ['AC-025', '-5', -5, []],
  ])('%s evaluates %s', async (_id, keys, result, calls) => {
    expect(await run(keys)).toEqual({ result, calls });
  });

  // The standard order of operations: parentheses, then roots and exponents,
  // then multiplication and division from left to right, then addition and
  // subtraction from left to right.
  it.each([
    ['multiplication before addition', '2+3*4', 14],
    ['multiplication before addition, either side', '2*3+4', 10],
    ['division before subtraction', '10-4/2', 8],
    ['division and multiplication from left to right', '8/2*4', 16],
    ['multiplication and division from left to right', '8*2/4', 4],
    ['subtraction and addition from left to right', '10-3+2', 9],
    ['exponent before addition', '2+3^2', 11],
    ['exponent before multiplication', '2*3^2', 18],
    ['exponent before a negative sign', '-3^2', -9],
    ['parentheses before an exponent', '(-3)^2', 9],
    ['exponents from right to left', '2^3^2', 512],
    ['parentheses override right to left', '(2^3)^2', 64],
    ['a negative exponent', '2^-1', 0.5],
    ['parentheses before multiplication', '2*(3+4)', 14],
    ['two groups', '(1+2)*(3+4)', 21],
    ['nested parentheses', '2*(3+(4-1)*2)', 18],
    ['a group as a divisor', '10/(2+3)', 2],
    ['square root before multiplication', '2+r16*3', 14],
    ['square root before an exponent', 'r16^2', 16],
    ['square root of a group', 'r(9+16)', 5],
    ['a negative operand', '2*-3+4', -2],
    ['four operations together', '1+2*3-4/2', 5],
    ['every level together', '100-2^3*5+r81/3', 63],
    ['percentage at the level of multiplication', '50+25%200', 62.5],
  ])('AC-058 %s: %s', async (_rule, keys, result) => {
    expect((await run(keys)).result).toBe(result);
  });

  it('AC-016 evaluates operands from left to right', async () => {
    const { result, calls } = await run('2*3+4*5+r36');
    expect(result).toBe(32);
    expect(calls).toEqual([
      ['multiply', [2, 3]],
      ['multiply', [4, 5]],
      ['squareRoot', 36],
      ['add', [6, 20, 6]],
    ]);
  });

  it.each([
    ['AC-034', '10/0', 'DIVISION_BY_ZERO'],
    ['AC-035', 'r-4', 'NEGATIVE_SQUARE_ROOT'],
    ['AC-036', '(-8)^0.5', 'UNDEFINED_RESULT'],
    ['AC-036', '10^400', 'RESULT_OUT_OF_RANGE'],
    ['AC-034', '25%0', 'DIVISION_BY_ZERO'],
  ])('%s fails %s with %s', async (_id, keys, code) => {
    const { api } = createFakeService();
    const failure = evaluate(parse(tokens(keys)), api);
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ code });
  });

  it('AC-040 stops at the first failure', async () => {
    const { api, calls } = createFakeService();
    await expect(evaluate(parse(tokens('1/0+2*3')), api)).rejects.toMatchObject({
      code: 'DIVISION_BY_ZERO',
    });
    expect(calls).toEqual([['divide', [1, 0]]]);
  });
});
