import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CalculatorApi } from '../calculator/types';
import { ApiError, createCalculatorApi } from './calculatorApi';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function stubFetch(respond: () => Response | Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(async () => respond());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createCalculatorApi', () => {
  const operations: [string, (api: CalculatorApi) => Promise<number>, string, unknown][] = [
    ['add', (api) => api.add([1, 2, 3]), '/api/v1/add', { numbers: [1, 2, 3] }],
    ['subtract', (api) => api.subtract([10, 3]), '/api/v1/subtract', { numbers: [10, 3] }],
    ['multiply', (api) => api.multiply([2, 3]), '/api/v1/multiply', { numbers: [2, 3] }],
    ['divide', (api) => api.divide([100, 5]), '/api/v1/divide', { numbers: [100, 5] }],
    ['exponent', (api) => api.exponent(2, 10), '/api/v1/exponent', { base: 2, exponent: 10 }],
    ['squareRoot', (api) => api.squareRoot(9), '/api/v1/square_root', { number: 9 }],
    ['percentage', (api) => api.percentage(25, 200), '/api/v1/percentage', { value: 25, total: 200 }],
  ];

  it.each(operations)('AC-052 %s posts its body and returns the result', async (name, call, path, body) => {
    const fetchMock = stubFetch(() => json({ operation: name, result: 42 }));

    await expect(call(createCalculatorApi(''))).resolves.toBe(42);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(path);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(init?.body))).toEqual(body);
  });

  it('AC-053 sends requests to the configured address', async () => {
    const fetchMock = stubFetch(() => json({ operation: 'add', result: 3 }));

    await createCalculatorApi('https://calc.example.com').add([1, 2]);
    await createCalculatorApi('https://calc.example.com/').add([1, 2]);

    expect(fetchMock.mock.calls[0][0]).toBe('https://calc.example.com/api/v1/add');
    expect(fetchMock.mock.calls[1][0]).toBe('https://calc.example.com/api/v1/add');
  });

  it.each(['DIVISION_BY_ZERO', 'NEGATIVE_SQUARE_ROOT', 'UNDEFINED_RESULT', 'RESULT_OUT_OF_RANGE'])(
    'AC-034 fails with the code %s from the service',
    async (code) => {
      stubFetch(() => json({ error: { code, message: 'details from the service' } }, 422));

      const failure = createCalculatorApi('').divide([1, 0]);

      await expect(failure).rejects.toBeInstanceOf(ApiError);
      await expect(failure).rejects.toMatchObject({ code, message: 'details from the service' });
    },
  );

  it('AC-037 fails with NETWORK_ERROR when the request does not complete', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(createCalculatorApi('').add([1, 2])).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it.each<[string, () => Response]>([
    ['an error that is not JSON', () => new Response('<html>Bad Gateway</html>', { status: 502 })],
    ['an error without a code', () => json({ message: 'no' }, 500)],
    ['a success that is not JSON', () => new Response('ok', { status: 200 })],
    ['a success without a result', () => json({ operation: 'add' })],
    ['a result that is not a number', () => json({ operation: 'add', result: '3' })],
    ['a null body', () => json(null)],
  ])('AC-038 fails with UNKNOWN for %s', async (_case, respond) => {
    stubFetch(respond);

    await expect(createCalculatorApi('').add([1, 2])).rejects.toMatchObject({ code: 'UNKNOWN' });
  });

  it('AC-038 passes on the INTERNAL_ERROR code of a 500', async () => {
    stubFetch(() => json({ error: { code: 'INTERNAL_ERROR', message: 'an unexpected error occurred' } }, 500));

    await expect(createCalculatorApi('').add([1, 2])).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
    });
  });
});
