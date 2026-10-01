import { ApiError } from '../api/calculatorApi';
import type { CalculatorApi } from '../calculator/types';

/** One recorded call: the operation name followed by its arguments. */
export type Call = [operation: string, ...args: unknown[]];

/**
 * An in-memory stand-in for the calculate service. It computes like the
 * service, fails with the same error codes, and records every call in order.
 */
export function createFakeService(): { api: CalculatorApi; calls: Call[] } {
  const calls: Call[] = [];

  const finish = (result: number): number => {
    if (Number.isNaN(result)) throw new ApiError('UNDEFINED_RESULT');
    if (!Number.isFinite(result)) throw new ApiError('RESULT_OUT_OF_RANGE');
    return result === 0 ? 0 : result;
  };

  const api: CalculatorApi = {
    async add(numbers) {
      calls.push(['add', numbers]);
      return finish(numbers.reduce((a, b) => a + b));
    },
    async subtract(numbers) {
      calls.push(['subtract', numbers]);
      return finish(numbers.reduce((a, b) => a - b));
    },
    async multiply(numbers) {
      calls.push(['multiply', numbers]);
      return finish(numbers.reduce((a, b) => a * b));
    },
    async divide(numbers) {
      calls.push(['divide', numbers]);
      if (numbers.slice(1).includes(0)) throw new ApiError('DIVISION_BY_ZERO');
      return finish(numbers.reduce((a, b) => a / b));
    },
    async exponent(base, exponent) {
      calls.push(['exponent', base, exponent]);
      if (base === 0 && exponent < 0) throw new ApiError('DIVISION_BY_ZERO');
      if (base < 0 && !Number.isInteger(exponent)) throw new ApiError('UNDEFINED_RESULT');
      return finish(base ** exponent);
    },
    async squareRoot(number) {
      calls.push(['squareRoot', number]);
      if (number < 0) throw new ApiError('NEGATIVE_SQUARE_ROOT');
      return finish(Math.sqrt(number));
    },
    async percentage(value, total) {
      calls.push(['percentage', value, total]);
      if (total === 0) throw new ApiError('DIVISION_BY_ZERO');
      return finish((value * 100) / total);
    },
  };

  return { api, calls };
}
