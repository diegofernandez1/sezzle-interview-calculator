import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/calculatorApi';
import { keyToAction } from '../calculator/keys';
import type { CalculatorApi } from '../calculator/types';
import { createFakeService } from '../test/fakeService';
import { useCalculator } from './useCalculator';

function setup(overrides: Partial<CalculatorApi> = {}) {
  const { api, calls } = createFakeService();
  const service = { ...api, ...overrides };
  const hook = renderHook(() => useCalculator(service));

  /** Presses keyboard keys one at a time; = evaluates and waits for the answer. */
  async function type(keys: string) {
    for (const key of keys) {
      act(() => hook.result.current.press(keyToAction(key)!));
      if (key === '=') {
        await waitFor(() => expect(hook.result.current.pending).toBe(false));
      }
    }
  }

  return { ...hook, calls, type };
}

describe('useCalculator', () => {
  it('AC-012 starts with an empty expression', () => {
    const { result } = setup();

    expect(result.current).toMatchObject({ expression: '0', previous: null, error: null, pending: false });
  });

  it('AC-001 builds the expression from presses', async () => {
    const { result, type, calls } = setup();

    await type('12+3*4');

    expect(result.current.expression).toBe('12 + 3 × 4');
    expect(calls).toEqual([]);
  });

  it('AC-016 evaluates through the service on equals', async () => {
    const { result, type, calls } = setup();

    await type('2+3*4=');

    expect(result.current).toMatchObject({ expression: '14', previous: '2 + 3 × 4 =', error: null });
    expect(calls).toEqual([
      ['multiply', [3, 4]],
      ['add', [2, 12]],
    ]);
  });

  it('AC-025 evaluates a single number without a request', async () => {
    const { result, type, calls } = setup();

    await type('5=');

    expect(result.current).toMatchObject({ expression: '5', previous: '5 =' });
    expect(calls).toEqual([]);
  });

  it('AC-026 reports an incomplete expression without a request', async () => {
    const { result, type, calls } = setup();

    await type('2+=');

    expect(result.current).toMatchObject({ expression: '2 +', error: 'Incomplete expression', pending: false });
    expect(calls).toEqual([]);
  });

  it('AC-026 does nothing on equals with an empty expression', async () => {
    const { result, type, calls } = setup();

    await type('=');

    expect(result.current).toMatchObject({ expression: '0', previous: null, error: null });
    expect(calls).toEqual([]);
  });

  it('AC-029 continues from the exact result', async () => {
    const { result, type, calls } = setup();

    await type('0.1+0.2=');
    expect(result.current.expression).toBe('0.3');
    await type('*10=');

    expect(calls[1]).toEqual(['multiply', [0.30000000000000004, 10]]);
    expect(result.current.expression).toBe('3');
  });

  it('AC-033 does nothing on equals after a result', async () => {
    const { result, type, calls } = setup();

    await type('2+3==');

    expect(calls).toHaveLength(1);
    expect(result.current).toMatchObject({ expression: '5', previous: '2 + 3 =' });
  });

  it('AC-034 shows the message of a service error and keeps the expression', async () => {
    const { result, type } = setup();

    await type('10/0=');

    expect(result.current).toMatchObject({
      expression: '10 ÷ 0',
      previous: null,
      error: "Can't divide by zero",
      pending: false,
    });
  });

  it('AC-037 shows a message when the service cannot be reached', async () => {
    const { result, type } = setup({ add: () => Promise.reject(new ApiError('NETWORK_ERROR')) });

    await type('2+3=');

    expect(result.current.error).toBe("Can't reach the calculator service");
  });

  it('AC-038 shows a general message for an unexpected failure', async () => {
    const { result, type } = setup({ add: () => Promise.reject(new Error('boom')) });

    await type('2+3=');

    expect(result.current.error).toBe('Something went wrong');
  });

  it('AC-039 recovers after an error', async () => {
    const { result, type } = setup();

    await type('10/0=');
    act(() => result.current.press({ type: 'backspace' }));
    expect(result.current).toMatchObject({ expression: '10 ÷', error: null });
    await type('5=');

    expect(result.current).toMatchObject({ expression: '2', error: null });
  });

  it('AC-041 is pending until the service answers, and ignores input meanwhile', async () => {
    let answer: ((result: number) => void) | undefined;
    const add = () => new Promise<number>((resolve) => (answer = resolve));
    const { result, type } = setup({ add });

    await type('2+3');
    act(() => result.current.press({ type: 'equals' }));
    expect(result.current.pending).toBe(true);
    await waitFor(() => expect(answer).toBeDefined());

    act(() => result.current.press({ type: 'digit', digit: '7' }));
    act(() => result.current.press({ type: 'clear' }));
    act(() => result.current.press({ type: 'equals' }));
    expect(result.current).toMatchObject({ expression: '2 + 3', pending: true });

    await act(async () => answer?.(5));
    expect(result.current).toMatchObject({ expression: '5', pending: false });
  });
});
