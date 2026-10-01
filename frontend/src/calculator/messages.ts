import { ApiError } from '../api/calculatorApi';

const MESSAGES: Record<string, string> = {
  DIVISION_BY_ZERO: "Can't divide by zero",
  NEGATIVE_SQUARE_ROOT: "Can't take the square root of a negative number",
  UNDEFINED_RESULT: 'The result is not a real number',
  RESULT_OUT_OF_RANGE: 'The result is too large',
  NETWORK_ERROR: "Can't reach the calculator service",
};

const FALLBACK = 'Something went wrong';

/** The message to show for a failed evaluation. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && Object.hasOwn(MESSAGES, error.code)) {
    return MESSAGES[error.code];
  }
  return FALLBACK;
}
