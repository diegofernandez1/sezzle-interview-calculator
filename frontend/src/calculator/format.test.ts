import { describe, expect, it } from 'vitest';
import { formatNumber, formatTokens } from './format';
import type { Token } from './types';

// Test names start with the acceptance scenario they verify; see
// specs/002-calculator-frontend/spec.md.

describe('formatNumber', () => {
  it.each([
    [5, '5'],
    [12.5, '12.5'],
    [-7, '-7'],
    [0, '0'],
    [1 / 3, '0.333333333333'],
    [123456789012345, '123456789012345'],
    [123456789.123456789, '123456789.123'],
    [2 ** 60, '1152921504610000000'],
    [1e21, '1e+21'],
    [1.5e-7, '1.5e-7'],
  ])('FR-018 formats %s as %s', (value, text) => {
    expect(formatNumber(value)).toBe(text);
  });

  it('AC-028 rounds away floating-point noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
  });
});

describe('formatTokens', () => {
  it('AC-012 shows 0 for an empty expression', () => {
    expect(formatTokens([])).toBe('0');
  });

  it('AC-005 shows each operator with its symbol', () => {
    const symbols: [Token, string][] = [
      [{ type: 'operator', op: 'add' }, '2 + 3'],
      [{ type: 'operator', op: 'subtract' }, '2 − 3'],
      [{ type: 'operator', op: 'multiply' }, '2 × 3'],
      [{ type: 'operator', op: 'divide' }, '2 ÷ 3'],
      [{ type: 'operator', op: 'exponent' }, '2 ^ 3'],
      [{ type: 'operator', op: 'percentage' }, '2 % of 3'],
    ];
    for (const [operator, text] of symbols) {
      const expression: Token[] = [{ type: 'number', text: '2' }, operator, { type: 'number', text: '3' }];
      expect(formatTokens(expression)).toBe(text);
    }
  });

  it('AC-005 drops the space after a trailing operator', () => {
    expect(formatTokens([{ type: 'number', text: '2' }, { type: 'operator', op: 'add' }])).toBe('2 +');
  });

  it('AC-008 writes a negative sign against its operand', () => {
    expect(
      formatTokens([
        { type: 'number', text: '2' },
        { type: 'operator', op: 'multiply' },
        { type: 'negate' },
        { type: 'number', text: '3' },
      ]),
    ).toBe('2 × −3');
  });

  it('AC-010 writes parentheses and square roots without spaces', () => {
    expect(
      formatTokens([
        { type: 'sqrt' },
        { type: 'lparen' },
        { type: 'number', text: '9' },
        { type: 'operator', op: 'add' },
        { type: 'number', text: '7' },
        { type: 'rparen' },
      ]),
    ).toBe('√(9 + 7)');
  });

  it('AC-023 shows a negative result with a minus sign', () => {
    expect(formatTokens([{ type: 'number', text: '-4', value: -4 }])).toBe('−4');
  });
});
