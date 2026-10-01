import type { CalculatorApi } from '../calculator/types';

/**
 * A failed call to the calculate service. `code` is the error code of the
 * service (such as DIVISION_BY_ZERO), NETWORK_ERROR if the request did not
 * complete, or UNKNOWN if the response was not what the contract promises.
 */
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string = code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Returns a client for the calculate service at `baseUrl`. An empty base
 * means the page's own origin, which is how the dev server proxy is reached.
 */
export function createCalculatorApi(baseUrl: string): CalculatorApi {
  const root = `${baseUrl.replace(/\/+$/, '')}/api/v1`;

  async function post(operation: string, body: unknown): Promise<number> {
    let response: Response;
    try {
      response = await fetch(`${root}/${operation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ApiError('NETWORK_ERROR');
    }

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const error = field(payload, 'error');
      const code = field(error, 'code');
      const message = field(error, 'message');
      if (typeof code === 'string') {
        throw new ApiError(code, typeof message === 'string' ? message : code);
      }
      throw new ApiError('UNKNOWN');
    }

    const result = field(payload, 'result');
    if (typeof result !== 'number') {
      throw new ApiError('UNKNOWN');
    }
    return result;
  }

  return {
    add: (numbers) => post('add', { numbers }),
    subtract: (numbers) => post('subtract', { numbers }),
    multiply: (numbers) => post('multiply', { numbers }),
    divide: (numbers) => post('divide', { numbers }),
    exponent: (base, exponent) => post('exponent', { base, exponent }),
    squareRoot: (number) => post('square_root', { number }),
    percentage: (value, total) => post('percentage', { value, total }),
  };
}

/** Reads a property of a value that may not be an object. */
function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[name] : undefined;
}

/** The client for the service configured at build time. */
export const calculatorApi = createCalculatorApi(import.meta.env.VITE_API_URL ?? '');
