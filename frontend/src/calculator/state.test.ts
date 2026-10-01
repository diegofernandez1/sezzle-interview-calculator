import { describe, expect, it } from 'vitest';
import { typed, withCursor } from '../test/tokens';
import { formatTokens } from './format';
import { initialState, reducer, type CalculatorState } from './state';

// `typed` feeds keyboard keys to the reducer: * is ×, / is ÷, ^ is the
// exponent, r is √, % is "% of". Test names start with the acceptance
// scenario they verify.

const shown = (state: CalculatorState) => formatTokens(state.tokens);
const backspace = (state: CalculatorState) => reducer(state, { type: 'backspace' });
const succeed = (state: CalculatorState, result: number) =>
  reducer(reducer(state, { type: 'evaluationStarted' }), { type: 'evaluationSucceeded', result });
const fail = (state: CalculatorState, message: string) =>
  reducer(reducer(state, { type: 'evaluationStarted' }), { type: 'evaluationFailed', message });

describe('numbers', () => {
  it('AC-001 builds a number from digits', () => {
    expect(shown(typed('123'))).toBe('123');
  });

  it('AC-002 replaces a leading zero', () => {
    expect(shown(typed('05'))).toBe('5');
    expect(shown(typed('00'))).toBe('0');
  });

  it('AC-002 keeps a zero before a decimal point', () => {
    expect(shown(typed('0.5'))).toBe('0.5');
  });

  it('AC-003 allows one decimal point per number', () => {
    expect(shown(typed('1.5.2'))).toBe('1.52');
    expect(shown(typed('1.5+2.5'))).toBe('1.5 + 2.5');
  });

  it('AC-003 starts a number with 0 when the decimal point comes first', () => {
    expect(shown(typed('.'))).toBe('0.');
    expect(shown(typed('2+.5'))).toBe('2 + 0.5');
  });

  it('AC-004 stops at 15 digits', () => {
    expect(shown(typed('1'.repeat(16)))).toBe('1'.repeat(15));
    expect(shown(typed('0.' + '1'.repeat(20)))).toBe('0.' + '1'.repeat(14));
  });
});

describe('operators', () => {
  it.each([
    ['+', '2 +'],
    ['-', '2 −'],
    ['*', '2 ×'],
    ['/', '2 ÷'],
    ['^', '2 ^'],
    ['%', '2 % of'],
  ])('AC-005 adds %s after a number', (key, text) => {
    expect(shown(typed('2' + key))).toBe(text);
  });

  it('AC-005 drops a trailing decimal point before an operator', () => {
    expect(shown(typed('2.+3'))).toBe('2 + 3');
  });

  it('AC-006 replaces an operator with the next one', () => {
    expect(shown(typed('2+*'))).toBe('2 ×');
    expect(shown(typed('2*+'))).toBe('2 +');
    expect(shown(typed('2+-'))).toBe('2 −');
    expect(shown(typed('2-+'))).toBe('2 +');
    expect(shown(typed('2--'))).toBe('2 −');
  });

  it('AC-007 starts from 0 when an operator comes first', () => {
    expect(shown(typed('+'))).toBe('0 +');
    expect(shown(typed('*5'))).toBe('0 × 5');
  });

  it('AC-008 enters a negative sign on an empty expression', () => {
    expect(typed('-').tokens).toEqual([{ type: 'negate' }]);
    expect(shown(typed('-5'))).toBe('−5');
  });

  it.each([
    ['2*-3', '2 × −3'],
    ['2/-3', '2 ÷ −3'],
    ['2^-3', '2 ^ −3'],
    ['2%-3', '2 % of −3'],
    ['(-3', '(−3'],
    ['r-4', '√−4'],
  ])('AC-008 enters a negative sign in %s', (keys, text) => {
    expect(shown(typed(keys))).toBe(text);
  });

  it('FR-006 ignores an operator pressed after a negative sign', () => {
    expect(shown(typed('2*-+'))).toBe('2 × −');
    expect(shown(typed('--'))).toBe('−');
  });

  it('FR-005 ignores an operator after an open parenthesis or a square root', () => {
    expect(shown(typed('(+'))).toBe('(');
    expect(shown(typed('r*'))).toBe('√');
  });
});

describe('parentheses and square root', () => {
  it('AC-009 ignores a close parenthesis when none is open', () => {
    expect(shown(typed(')'))).toBe('0');
    expect(shown(typed('2)'))).toBe('2');
    expect(shown(typed('(2))'))).toBe('(2)');
  });

  it('AC-009 ignores a close parenthesis that does not follow an operand', () => {
    expect(shown(typed('()'))).toBe('(');
    expect(shown(typed('(2+)'))).toBe('(2 +');
  });

  it('AC-009 closes nested parentheses', () => {
    expect(shown(typed('((2+3)*4)'))).toBe('((2 + 3) × 4)');
  });

  it.each([
    ['2(', '2 × ('],
    ['2r', '2 × √'],
    ['(2)5', '(2) × 5'],
    ['(2)(', '(2) × ('],
    ['(2)r', '(2) × √'],
    ['(2).5', '(2) × 0.5'],
  ])('AC-010 inserts a multiplication in %s', (keys, text) => {
    expect(shown(typed(keys))).toBe(text);
  });

  it('FR-008 accepts a square root after an operator, a parenthesis, or a negative sign', () => {
    expect(shown(typed('2+r9'))).toBe('2 + √9');
    expect(shown(typed('(r9'))).toBe('(√9');
    expect(shown(typed('-r9'))).toBe('−√9');
    expect(shown(typed('rr16'))).toBe('√√16');
  });
});

describe('backspace and clear', () => {
  it('AC-011 removes the last digit, then the last item', () => {
    let state = typed('12+3');
    state = backspace(state);
    expect(shown(state)).toBe('12 +');
    state = backspace(state);
    expect(shown(state)).toBe('12');
    state = backspace(state);
    expect(shown(state)).toBe('1');
    state = backspace(state);
    expect(shown(state)).toBe('0');
    state = backspace(state);
    expect(shown(state)).toBe('0');
  });

  it('AC-011 removes parentheses, square roots, and negative signs one at a time', () => {
    let state = typed('2*-r(');
    for (const text of ['2 × −√', '2 × −', '2 ×', '2']) {
      state = backspace(state);
      expect(shown(state)).toBe(text);
    }
  });

  it('AC-012 clears everything', () => {
    expect(reducer(typed('12+3'), { type: 'clear' })).toEqual(initialState);
    expect(reducer(succeed(typed('2+3'), 5), { type: 'clear' })).toEqual(initialState);
    expect(reducer(fail(typed('1/0'), 'No'), { type: 'clear' })).toEqual(initialState);
  });
});

describe('evaluation', () => {
  it('AC-041 is pending between start and finish', () => {
    const started = reducer(typed('2+3'), { type: 'evaluationStarted' });
    expect(started.pending).toBe(true);
    expect(succeed(typed('2+3'), 5).pending).toBe(false);
    expect(fail(typed('2+3'), 'No').pending).toBe(false);
  });

  it('AC-041 ignores input while pending', () => {
    const started = reducer(typed('2+3'), { type: 'evaluationStarted' });
    expect(typed('7', started)).toBe(started);
    expect(reducer(started, { type: 'clear' })).toBe(started);
    expect(reducer(started, { type: 'backspace' })).toBe(started);
  });

  it('AC-027 replaces the expression with the result and remembers the expression', () => {
    const state = succeed(typed('2+3'), 5);
    expect(shown(state)).toBe('5');
    expect(state.previous).toBe('2 + 3 =');
    expect(state.evaluated).toBe(true);
    expect(state.error).toBeNull();
  });

  it('AC-028 shows the rounded result and keeps the exact one', () => {
    const state = succeed(typed('0.1+0.2'), 0.1 + 0.2);
    expect(state.tokens).toEqual([{ type: 'number', text: '0.3', value: 0.30000000000000004 }]);
  });

  it('FR-015 leaves the equals action to the caller', () => {
    const state = typed('2+3');
    expect(reducer(state, { type: 'equals' })).toBe(state);
  });
});

describe('after a result', () => {
  const result = succeed(typed('2+3'), 5);

  it('AC-029 continues from the result when an operator follows', () => {
    const state = typed('*2', result);
    expect(shown(state)).toBe('5 × 2');
    expect(state.tokens[0]).toEqual({ type: 'number', text: '5', value: 5 });
    expect(state.evaluated).toBe(false);
    expect(state.previous).toBeNull();
  });

  it('AC-030 starts a new expression when a digit follows', () => {
    expect(shown(typed('7', result))).toBe('7');
    expect(typed('7', result).previous).toBeNull();
  });

  it('AC-030 starts a new expression when a decimal point or parenthesis follows', () => {
    expect(shown(typed('.5', result))).toBe('0.5');
    expect(shown(typed('(', result))).toBe('(');
  });

  it('AC-031 takes the square root of the result', () => {
    const state = typed('r', succeed(typed('7+9'), 16));
    expect(shown(state)).toBe('√16');
    expect(state.evaluated).toBe(false);
  });

  it('AC-032 clears the result on backspace', () => {
    const state = backspace(result);
    expect(shown(state)).toBe('0');
    expect(state.previous).toBeNull();
    expect(state.evaluated).toBe(false);
  });

  it('FR-019 ignores a close parenthesis', () => {
    expect(typed(')', result)).toBe(result);
  });

  it('FR-019 treats a carried result as one item', () => {
    const negative = succeed(typed('3-10'), -7);
    const carried = typed('+', negative);
    expect(shown(carried)).toBe('−7 +');
    // Backspace removes the operator, then the whole result, never one digit.
    expect(shown(backspace(carried))).toBe('−7');
    expect(shown(backspace(backspace(carried)))).toBe('0');
    // A digit replaces it.
    expect(shown(typed('4', backspace(carried)))).toBe('4');
    expect(shown(typed('.', backspace(carried)))).toBe('0.');
  });
});

describe('errors', () => {
  it('AC-034 keeps the expression and shows the message', () => {
    const state = fail(typed('10/0'), "Can't divide by zero");
    expect(shown(state)).toBe('10 ÷ 0');
    expect(state.error).toBe("Can't divide by zero");
    expect(state.evaluated).toBe(false);
  });

  it('AC-039 removes the message on the next input', () => {
    const failed = fail(typed('10/0'), "Can't divide by zero");
    const edited = backspace(failed);
    expect(edited.error).toBeNull();
    expect(shown(edited)).toBe('10 ÷');
    expect(typed('5', failed).error).toBeNull();
  });

  it('AC-039 removes the message even when the input changes nothing', () => {
    const failed = fail(typed('2+'), 'Incomplete expression');
    const next = typed(')', failed);
    expect(next.error).toBeNull();
    expect(shown(next)).toBe('2 +');
  });

  it('AC-039 removes the message when a new evaluation starts', () => {
    const failed = fail(typed('10/0'), "Can't divide by zero");
    expect(reducer(failed, { type: 'evaluationStarted' }).error).toBeNull();
  });
});

// In `typed`, < and > move the cursor, [ and ] send it to the start and the
// end, and ~ is backspace. `withCursor` shows the display with ‸ at the cursor.
describe('cursor', () => {
  it.each([
    ['AC-059 starts at the end', '12+3', '12 + 3‸'],
    ['AC-059 starts at the end of nothing', '', '0‸'],
    ['AC-060 moves left over an item at a time', '12+3<<', '12‸ + 3'],
    ['AC-060 inserts a digit at the cursor', '12+3<<5', '125‸ + 3'],
    ['AC-061 goes inside a number', '123<', '12‸3'],
    ['AC-061 splits a number with an operator', '123<+', '12 + ‸3'],
    ['AC-062 removes the digit left of the cursor', '123<~', '1‸3'],
    ['AC-062 joins two numbers when their operator is removed', '12+3<~', '12‸3'],
    ['AC-063 drops the second decimal point when numbers join', '1.2+3.4<<<~', '1.2‸34'],
    ['AC-064 stops at the start', '12<<<', '‸12'],
    ['AC-064 stops at the end', '12>', '12‸'],
    ['AC-064 has nothing to remove at the start', '12<<~', '‸12'],
    ['AC-065 moves left', '123<<', '1‸23'],
    ['AC-065 moves right', '123<<>', '12‸3'],
    ['AC-065 jumps to the start', '123[', '‸123'],
    ['AC-065 jumps to the end', '123[]', '123‸'],
    ['AC-067 replaces the operator right of the cursor', '2+3<<*', '2 × ‸3'],
    ['AC-068 multiplies an operand typed before a group', '(2)[5', '5‸ × (2)'],
    ['AC-069 turns a negative sign into a subtraction', '2*-3<<~', '2‸ − 3'],
    ['AC-071 can leave an expression that cannot be evaluated', '2(3)<<<~', '2‸(3)'],
    ['FR-040 inserts a decimal point inside a number', '125<.', '12.‸5'],
    ['FR-040 allows one decimal point when inserting', '1.25<.', '1.2‸5'],
    ['FR-040 inserts a square root before a number', '9[r', '√‸9'],
    ['FR-040 inserts a parenthesis before a number', '2+3<(', '2 + (‸3'],
    ['FR-041 removes an operator as one item', '2%3<~', '2‸3'],
    ['FR-042 multiplies an operand typed before a square root', 'r9[2', '2‸ × √9'],
    ['FR-042 multiplies after a parenthesis closed before a number', '(23<)', '(2)‸ × 3'],
    ['FR-043 turns a subtraction into a negative sign', '2-3<<~', '‸−3'],
    ['FR-043 turns a negative sign into a subtraction', '-3[2', '2‸ − 3'],
  ])('%s: %s', (_rule, keys, shown) => {
    expect(withCursor(typed(keys))).toBe(shown);
  });

  it('AC-064 returns the same state when the cursor cannot move', () => {
    const atEnd = typed('12');
    expect(typed('>', atEnd)).toBe(atEnd);
    const atStart = typed('12[');
    expect(typed('<', atStart)).toBe(atStart);
  });

  it('AC-066 places the cursor at a position, within the expression', () => {
    const state = typed('12+3');
    const at = (position: number) => withCursor(reducer(state, { type: 'placeCursor', position }));

    expect(at(2)).toBe('12‸ + 3');
    expect(at(3)).toBe('12 + ‸3');
    expect(at(0)).toBe('‸12 + 3');
    expect(at(99)).toBe('12 + 3‸');
    expect(at(-5)).toBe('‸12 + 3');
  });

  it('AC-070 puts the cursor at the end of a result', () => {
    const state = succeed(typed('12+3<<5'), 128);
    expect(withCursor(state)).toBe('128‸');
  });

  it('AC-072 treats a result the same wherever the cursor is', () => {
    const moved = typed('<', succeed(typed('2+3'), 5));
    expect(withCursor(moved)).toBe('‸5');
    expect(moved.evaluated).toBe(true);
    expect(withCursor(typed('7', moved))).toBe('7‸');
    expect(withCursor(typed('*', moved))).toBe('5 × ‸');
    expect(withCursor(typed('r', moved))).toBe('√5‸');
  });

  it('AC-072 steps over a carried result as one item', () => {
    const carried = typed('+5', succeed(typed('3-10'), -7));
    expect(withCursor(typed('[>', carried))).toBe('−7‸ + 5');
    // An operand typed before it is multiplied with it; the two never join.
    expect(withCursor(typed('[4', carried))).toBe('4‸ × −7 + 5');
  });

  it('AC-073 keeps the message when only the cursor moves', () => {
    const failed = fail(typed('1/0'), "Can't divide by zero");
    const moved = typed('<', failed);
    expect(moved.error).toBe("Can't divide by zero");
    expect(withCursor(moved)).toBe('1 ÷ ‸0');
    expect(reducer(failed, { type: 'placeCursor', position: 0 }).error).toBe("Can't divide by zero");
  });

  it('AC-074 ignores cursor moves while pending', () => {
    const started = reducer(typed('2+3'), { type: 'evaluationStarted' });
    expect(typed('<', started)).toBe(started);
    expect(typed('[', started)).toBe(started);
    expect(reducer(started, { type: 'placeCursor', position: 0 })).toBe(started);
  });

  it('AC-012 clear returns the cursor to the start of an empty expression', () => {
    expect(reducer(typed('12+3<<'), { type: 'clear' })).toEqual(initialState);
  });
});
