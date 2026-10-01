import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/calculatorApi';
import type { CalculatorApi } from '../calculator/types';
import { createFakeService } from '../test/fakeService';
import { Calculator } from './Calculator';

// These tests run the acceptance scenarios of
// specs/002-calculator-frontend/spec.md through the rendered calculator,
// against the fake service. Test names start with the scenario ID.

/** Button labels as written in the spec, and the accessible names to find them by. */
const NAMES: Record<string, string> = {
  '+': 'add',
  '−': 'subtract',
  '×': 'multiply',
  '÷': 'divide',
  'xʸ': 'power',
  '√': 'square root',
  '%': 'as a percentage of',
  '(': 'open parenthesis',
  ')': 'close parenthesis',
  '.': 'decimal point',
  '=': 'equals',
  '⌫': 'backspace',
  AC: 'clear',
};

const button = (label: string) => screen.getByRole('button', { name: NAMES[label] ?? label });
const calculator = () => screen.getByRole('region', { name: 'Calculator' });
const display = () => screen.getByRole('status').textContent;
const message = () => screen.queryByRole('alert')?.textContent ?? null;
const idle = () => waitFor(() => expect(calculator()).toHaveAttribute('aria-busy', 'false'));

function setup(overrides: Partial<CalculatorApi> = {}) {
  const { api, calls } = createFakeService();
  const user = userEvent.setup();
  render(<Calculator api={{ ...api, ...overrides }} />);

  /** Clicks buttons by label, separated by spaces, waiting out each evaluation. */
  async function press(labels: string) {
    for (const label of labels.split(' ')) {
      await user.click(button(label));
      await idle();
    }
  }

  /** Types keys in user-event syntax, then waits out any evaluation. */
  async function type(keys: string) {
    await user.keyboard(keys);
    await idle();
  }

  return { calls, user, press, type };
}

describe('building an expression', () => {
  it.each([
    ['AC-001', '1 2 3', '123'],
    ['AC-002', '0 5', '5'],
    ['AC-002', '0 . 5', '0.5'],
    ['AC-003', '1 . 5 . 2', '1.52'],
    ['AC-003', '.', '0.'],
    ['AC-004', Array(16).fill('1').join(' '), '1'.repeat(15)],
    ['AC-005', '2 + −', '2 −'],
    ['AC-005', '2 + ×', '2 ×'],
    ['AC-005', '2 + ÷', '2 ÷'],
    ['AC-005', '2 + xʸ', '2 ^'],
    ['AC-005', '2 + %', '2 % of'],
    ['AC-006', '2 + ×', '2 ×'],
    ['AC-007', '+', '0 +'],
    ['AC-008', '− 5', '−5'],
    ['AC-008', '2 × − 3', '2 × −3'],
    ['AC-009', ')', '0'],
    ['AC-009', '( )', '('],
    ['AC-009', '( 2 + )', '(2 +'],
    ['AC-010', '2 (', '2 × ('],
    ['AC-010', '2 √', '2 × √'],
    ['AC-010', '( 2 ) 5', '(2) × 5'],
    ['AC-010', '( 2 ) (', '(2) × ('],
    ['AC-012', '1 2 + 3 AC', '0'],
  ])('%s pressing %s shows %s', async (_id, labels, shown) => {
    const { press, calls } = setup();

    await press(labels);

    expect(display()).toBe(shown);
    expect(calls).toEqual([]);
  });

  it('AC-011 backspace removes the last digit, then the last item', async () => {
    const { press } = setup();

    await press('1 2 + 3');
    for (const shown of ['12 +', '12', '1']) {
      await press('⌫');
      expect(display()).toBe(shown);
    }
  });
});

describe('evaluating', () => {
  it.each([
    ['AC-013', '2 + 3 =', '5', [['add', [2, 3]]]],
    ['AC-014', '1 + 2 + 3 =', '6', [['add', [1, 2, 3]]]],
    ['AC-015', '1 0 − 3 − 2 =', '5', [['subtract', [10, 3, 2]]]],
    [
      'AC-016',
      '2 + 3 × 4 =',
      '14',
      [
        ['multiply', [3, 4]],
        ['add', [2, 12]],
      ],
    ],
    [
      'AC-017',
      '1 0 − 3 + 2 =',
      '9',
      [
        ['subtract', [10, 3]],
        ['add', [7, 2]],
      ],
    ],
    ['AC-018', '1 0 0 ÷ 5 ÷ 2 =', '10', [['divide', [100, 5, 2]]]],
    [
      'AC-019',
      '2 xʸ 3 xʸ 2 =',
      '512',
      [
        ['exponent', 3, 2],
        ['exponent', 2, 9],
      ],
    ],
    ['AC-020', '√ 9 =', '3', [['squareRoot', 9]]],
    [
      'AC-020',
      '√ ( 9 + 7 ) =',
      '4',
      [
        ['add', [9, 7]],
        ['squareRoot', 16],
      ],
    ],
    ['AC-021', '2 5 % 2 0 0 =', '12.5', [['percentage', 25, 200]]],
    [
      'AC-022',
      '( 2 + 3 ) × 4 =',
      '20',
      [
        ['add', [2, 3]],
        ['multiply', [5, 4]],
      ],
    ],
    [
      'AC-023',
      '− 2 xʸ 2 =',
      '−4',
      [
        ['exponent', 2, 2],
        ['multiply', [-1, 4]],
      ],
    ],
    ['AC-023', '2 × − 3 =', '−6', [['multiply', [2, -3]]]],
    ['AC-024', '( 2 + 3 =', '5', [['add', [2, 3]]]],
    ['AC-025', '5 =', '5', []],
  ])('%s pressing %s gives %s', async (_id, labels, result, requests) => {
    const { press, calls } = setup();

    await press(labels);

    expect(display()).toBe(result);
    expect(calls).toEqual(requests);
    expect(message()).toBeNull();
  });

  it.each([
    ['1 0 − 4 ÷ 2 =', '8'],
    ['8 ÷ 2 × 4 =', '16'],
    ['2 × 3 xʸ 2 =', '18'],
    ['− 3 xʸ 2 =', '−9'],
    ['( − 3 ) xʸ 2 =', '9'],
    ['2 × ( 3 + ( 4 − 1 ) × 2 ) =', '18'],
    ['1 + 2 × 3 − 4 ÷ 2 =', '5'],
    ['1 0 0 − 2 xʸ 3 × 5 + √ 8 1 ÷ 3 =', '63'],
  ])('AC-058 pressing %s follows the order of operations and gives %s', async (labels, result) => {
    const { press } = setup();

    await press(labels);

    expect(display()).toBe(result);
  });

  it.each([
    ['2 + =', '2 +'],
    ['( =', '('],
    ['√ =', '√'],
  ])('AC-026 pressing %s reports an incomplete expression', async (labels, shown) => {
    const { press, calls } = setup();

    await press(labels);

    expect(message()).toBe('Incomplete expression');
    expect(display()).toBe(shown);
    expect(calls).toEqual([]);
  });
});

describe('results', () => {
  it('AC-027 shows the evaluated expression above the result', async () => {
    const { press } = setup();

    await press('2 + 3 =');

    expect(display()).toBe('5');
    expect(screen.getByText('2 + 3 =')).toBeInTheDocument();
  });

  it('AC-028 shows a rounded result', async () => {
    const { press } = setup();

    await press('0 . 1 + 0 . 2 =');

    expect(display()).toBe('0.3');
  });

  it('AC-029 continues from the exact result when an operator follows', async () => {
    const { press, calls } = setup();

    await press('0 . 1 + 0 . 2 = × 1 0 =');

    expect(calls[1]).toEqual(['multiply', [0.30000000000000004, 10]]);
    expect(display()).toBe('3');
  });

  it('AC-030 starts a new expression when a digit follows', async () => {
    const { press } = setup();

    await press('2 + 3 = 7');

    expect(display()).toBe('7');
    expect(screen.queryByText('2 + 3 =')).not.toBeInTheDocument();
  });

  it('AC-031 takes the square root of the result', async () => {
    const { press, calls } = setup();

    await press('7 + 9 = √');
    expect(display()).toBe('√16');
    await press('=');

    expect(calls[1]).toEqual(['squareRoot', 16]);
    expect(display()).toBe('4');
  });

  it('AC-032 backspace clears the result', async () => {
    const { press } = setup();

    await press('2 + 3 = ⌫');

    expect(display()).toBe('0');
  });

  it('AC-033 equals does nothing after a result', async () => {
    const { press, calls } = setup();

    await press('2 + 3 = =');

    expect(calls).toHaveLength(1);
    expect(display()).toBe('5');
  });
});

describe('errors', () => {
  it.each([
    ['AC-034', '1 0 ÷ 0 =', "Can't divide by zero", '10 ÷ 0'],
    ['AC-035', '√ − 4 =', "Can't take the square root of a negative number", '√−4'],
    ['AC-036', '( − 8 ) xʸ 0 . 5 =', 'The result is not a real number', '(−8) ^ 0.5'],
    ['AC-036', '1 0 xʸ 4 0 0 =', 'The result is too large', '10 ^ 400'],
  ])('%s pressing %s shows the message and keeps the expression', async (_id, labels, text, shown) => {
    const { press } = setup();

    await press(labels);

    expect(message()).toBe(text);
    expect(display()).toBe(shown);
  });

  it('AC-037 shows a message when the service cannot be reached', async () => {
    const { press } = setup({ add: () => Promise.reject(new ApiError('NETWORK_ERROR')) });

    await press('2 + 3 =');

    expect(message()).toBe("Can't reach the calculator service");
    expect(display()).toBe('2 + 3');
  });

  it.each([
    ['a 500', new ApiError('INTERNAL_ERROR')],
    ['an unknown code', new ApiError('SOMETHING_NEW')],
    ['a response that is not JSON', new ApiError('UNKNOWN')],
    ['an unexpected exception', new Error('boom')],
  ])('AC-038 shows a general message for %s', async (_case, error) => {
    const { press } = setup({ add: () => Promise.reject(error) });

    await press('2 + 3 =');

    expect(message()).toBe('Something went wrong');
  });

  it('AC-039 the next input removes the message, and the expression can be fixed', async () => {
    const { press } = setup();

    await press('1 0 ÷ 0 =');
    expect(message()).toBe("Can't divide by zero");
    await press('⌫');
    expect(message()).toBeNull();
    expect(display()).toBe('10 ÷');
    await press('5 =');

    expect(display()).toBe('2');
  });

  it('AC-040 stops at the first failure', async () => {
    const { press, calls } = setup();

    await press('1 ÷ 0 + 2 × 3 =');

    expect(calls).toEqual([['divide', [1, 0]]]);
    expect(message()).toBe("Can't divide by zero");
  });
});

describe('waiting', () => {
  it('AC-041 disables input until the service answers', async () => {
    let answer!: (result: number) => void;
    const add = () => new Promise<number>((resolve) => (answer = resolve));
    const { user } = setup({ add });
    const buttons = () => within(screen.getByRole('group', { name: 'Calculator keypad' })).getAllByRole('button');

    for (const label of ['2', '+', '3', '=']) {
      await user.click(button(label));
    }

    expect(calculator()).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('progressbar', { name: 'Calculating' })).toBeInTheDocument();
    for (const each of buttons()) {
      expect(each).toBeDisabled();
    }

    await user.keyboard('7{Escape}{Enter}');
    expect(display()).toBe('2 + 3');

    await act(async () => answer(5));

    expect(calculator()).toHaveAttribute('aria-busy', 'false');
    expect(display()).toBe('5');
    for (const each of buttons()) {
      expect(each).toBeEnabled();
    }
  });
});

describe('keyboard', () => {
  it('AC-042 types a number', async () => {
    const { type } = setup();

    await type('12.5');

    expect(display()).toBe('12.5');
  });

  it('AC-043 types operators', async () => {
    const { type } = setup();

    await type('2+3-1*4/2^2');

    expect(display()).toBe('2 + 3 − 1 × 4 ÷ 2 ^ 2');
  });

  it.each([
    ['2x3', '2 × 3'],
    ['r9', '√9'],
    ['25%200', '25 % of 200'],
    ['(2+3)', '(2 + 3)'],
    ['1,5', '1.5'],
  ])('AC-044 typing %s shows %s', async (keys, shown) => {
    const { type } = setup();

    await type(keys);

    expect(display()).toBe(shown);
  });

  it.each(['{Enter}', '='])('AC-045 evaluates on %s', async (key) => {
    const { type, calls } = setup();

    await type(`2+3${key}`);

    expect(display()).toBe('5');
    expect(calls).toEqual([['add', [2, 3]]]);
  });

  it.each([
    ['{Backspace}', '1'],
    ['{Escape}', '0'],
    ['{Delete}', '0'],
  ])('AC-046 typing 12 then %s shows %s', async (key, shown) => {
    const { type } = setup();

    await type(`12${key}`);

    expect(display()).toBe(shown);
  });

  it('AC-047 leaves keys pressed with Ctrl, Meta, or Alt to the browser', async () => {
    const { type } = setup();

    await type('{Control>}1{/Control}{Meta>}r{/Meta}{Alt>}5{/Alt}');

    expect(display()).toBe('0');
  });

  it('AC-016 mixes keys and buttons in one expression', async () => {
    const { type, press, calls } = setup();

    await type('2+');
    await press('3 ×');
    await type('4{Enter}');

    expect(display()).toBe('14');
    expect(calls).toHaveLength(2);
  });
});

describe('accessibility', () => {
  it('AC-048 names the calculator and its keypad', () => {
    setup();

    expect(calculator()).toBeInTheDocument();
    expect(within(calculator()).getByRole('group', { name: 'Calculator keypad' })).toBeInTheDocument();
  });

  it('AC-049 puts the result in a status region and a message in an alert', async () => {
    const { press } = setup();

    await press('2 + 3 =');
    expect(screen.getByRole('status')).toHaveTextContent(/^5$/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await press('AC 1 ÷ 0 =');
    expect(screen.getByRole('alert')).toHaveTextContent("Can't divide by zero");
  });

  it('AC-050 Enter on a focused button presses that button once and does not evaluate', async () => {
    const { user, press, calls } = setup();

    await press('2 +');
    act(() => button('7').focus());
    await user.keyboard('{Enter}');

    expect(display()).toBe('2 + 7');
    expect(calls).toEqual([]);
  });

  it('AC-050 Space on a focused button presses that button', async () => {
    const { user } = setup();

    act(() => button('7').focus());
    await user.keyboard(' ');

    expect(display()).toBe('7');
  });

  it('AC-051 a mouse click leaves focus off the button, so Enter evaluates', async () => {
    const { user, press, calls } = setup();

    await press('2 + 3');
    expect(button('3')).not.toHaveFocus();
    await user.keyboard('{Enter}');
    await idle();

    expect(display()).toBe('5');
    expect(calls).toEqual([['add', [2, 3]]]);
  });

  it('FR-025 explains the keyboard keys', () => {
    setup();

    expect(screen.getByText(/Enter/)).toBeInTheDocument();
  });
});
