import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/calculatorApi';
import { errorMessage } from './messages';

describe('errorMessage', () => {
  it.each([
    ['AC-034', 'DIVISION_BY_ZERO', "Can't divide by zero"],
    ['AC-035', 'NEGATIVE_SQUARE_ROOT', "Can't take the square root of a negative number"],
    ['AC-036', 'UNDEFINED_RESULT', 'The result is not a real number'],
    ['AC-036', 'RESULT_OUT_OF_RANGE', 'The result is too large'],
    ['AC-037', 'NETWORK_ERROR', "Can't reach the calculator service"],
    ['AC-038', 'INTERNAL_ERROR', 'Something went wrong'],
    ['AC-038', 'VALIDATION_ERROR', 'Something went wrong'],
    ['AC-038', 'UNKNOWN', 'Something went wrong'],
  ])('%s shows a message for %s', (_id, code, message) => {
    expect(errorMessage(new ApiError(code))).toBe(message);
  });

  it('AC-038 shows a general message for anything that is not a service error', () => {
    expect(errorMessage(new Error('boom'))).toBe('Something went wrong');
    expect(errorMessage('boom')).toBe('Something went wrong');
    expect(errorMessage(undefined)).toBe('Something went wrong');
  });
});
