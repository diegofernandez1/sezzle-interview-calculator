import { describe, expect, it } from 'vitest';
import { tokens } from '../test/tokens';
import { parse } from './parser';
import type { Node } from './types';

// `tokens` types keyboard keys: * is ×, / is ÷, ^ is the exponent, r is √,
// % is "% of". Test names start with the acceptance scenario they verify.

const n = (value: number): Node => ({ kind: 'number', value });
const list = (op: 'add' | 'subtract' | 'multiply' | 'divide', ...operands: Node[]): Node => ({
  kind: 'list',
  op,
  operands,
});
const parsed = (keys: string) => parse(tokens(keys));

describe('parse', () => {
  it('AC-013 parses one operation', () => {
    expect(parsed('2+3')).toEqual(list('add', n(2), n(3)));
  });

  it('AC-014 puts a run of additions in one node', () => {
    expect(parsed('1+2+3')).toEqual(list('add', n(1), n(2), n(3)));
  });

  it('AC-015 puts a run of subtractions in one node, in order', () => {
    expect(parsed('10-3-2')).toEqual(list('subtract', n(10), n(3), n(2)));
  });

  it('AC-016 multiplies before adding', () => {
    expect(parsed('2+3*4')).toEqual(list('add', n(2), list('multiply', n(3), n(4))));
    expect(parsed('2*3+4')).toEqual(list('add', list('multiply', n(2), n(3)), n(4)));
  });

  it('AC-017 starts a new node when the operator changes', () => {
    expect(parsed('10-3+2')).toEqual(list('add', list('subtract', n(10), n(3)), n(2)));
    expect(parsed('1+2-3-4+5')).toEqual(
      list('add', list('subtract', list('add', n(1), n(2)), n(3), n(4)), n(5)),
    );
  });

  it('AC-018 puts a run of divisions or multiplications in one node', () => {
    expect(parsed('100/5/2')).toEqual(list('divide', n(100), n(5), n(2)));
    expect(parsed('2*3*4')).toEqual(list('multiply', n(2), n(3), n(4)));
    expect(parsed('8/2*3')).toEqual(list('multiply', list('divide', n(8), n(2)), n(3)));
  });

  it('AC-019 applies exponents from right to left', () => {
    expect(parsed('2^3^2')).toEqual({
      kind: 'exponent',
      base: n(2),
      exponent: { kind: 'exponent', base: n(3), exponent: n(2) },
    });
  });

  it('AC-019 applies an exponent before multiplying', () => {
    expect(parsed('2*3^2')).toEqual(
      list('multiply', n(2), { kind: 'exponent', base: n(3), exponent: n(2) }),
    );
  });

  it('AC-020 parses a square root of a number and of a group', () => {
    expect(parsed('r9')).toEqual({ kind: 'sqrt', operand: n(9) });
    expect(parsed('r(9+7)')).toEqual({ kind: 'sqrt', operand: list('add', n(9), n(7)) });
  });

  it('AC-020 applies a square root before an exponent', () => {
    expect(parsed('r9^2')).toEqual({
      kind: 'exponent',
      base: { kind: 'sqrt', operand: n(9) },
      exponent: n(2),
    });
    expect(parsed('rr16')).toEqual({ kind: 'sqrt', operand: { kind: 'sqrt', operand: n(16) } });
  });

  it('AC-021 parses a percentage at the level of multiplication', () => {
    expect(parsed('25%200')).toEqual({ kind: 'percentage', value: n(25), total: n(200) });
    expect(parsed('1+25%200')).toEqual(
      list('add', n(1), { kind: 'percentage', value: n(25), total: n(200) }),
    );
    expect(parsed('2*25%200')).toEqual({
      kind: 'percentage',
      value: list('multiply', n(2), n(25)),
      total: n(200),
    });
  });

  it('AC-022 evaluates parentheses first', () => {
    expect(parsed('(2+3)*4')).toEqual(list('multiply', list('add', n(2), n(3)), n(4)));
    expect(parsed('2*(3+4)')).toEqual(list('multiply', n(2), list('add', n(3), n(4))));
  });

  it('AC-022 keeps a group on the right as its own node', () => {
    expect(parsed('10-(3-2)')).toEqual(list('subtract', n(10), list('subtract', n(3), n(2))));
  });

  it('AC-023 turns a negative sign on a number into a negative number', () => {
    expect(parsed('-5')).toEqual(n(-5));
    expect(parsed('2*-3')).toEqual(list('multiply', n(2), n(-3)));
    expect(parsed('2^-3')).toEqual({ kind: 'exponent', base: n(2), exponent: n(-3) });
    expect(parsed('r-4')).toEqual({ kind: 'sqrt', operand: n(-4) });
  });

  it('AC-023 applies an exponent before a negative sign', () => {
    expect(parsed('-2^2')).toEqual({
      kind: 'negate',
      operand: { kind: 'exponent', base: n(2), exponent: n(2) },
    });
  });

  it('AC-023 keeps a negative sign on a group or a square root as a node', () => {
    expect(parsed('-(2+3)')).toEqual({ kind: 'negate', operand: list('add', n(2), n(3)) });
    expect(parsed('-r9')).toEqual({ kind: 'negate', operand: { kind: 'sqrt', operand: n(9) } });
  });

  it('AC-024 closes parentheses left open', () => {
    expect(parsed('(2+3')).toEqual(list('add', n(2), n(3)));
    expect(parsed('2*(3+(4-1')).toEqual(
      list('multiply', n(2), list('add', n(3), list('subtract', n(4), n(1)))),
    );
  });

  it('AC-025 parses a single number', () => {
    expect(parsed('5')).toEqual(n(5));
    expect(parsed('0.5')).toEqual(n(0.5));
    expect(parsed('5.')).toEqual(n(5));
  });

  it('AC-029 uses the exact value of a carried result', () => {
    expect(parse([{ type: 'number', text: '0.3', value: 0.30000000000000004 }])).toEqual(
      n(0.30000000000000004),
    );
  });

  it.each(['2+', '(', 'r', '-', '2*-', '2^', '2%', '(2+', 'r('])(
    'AC-026 rejects the incomplete expression %s',
    (keys) => {
      expect(() => parsed(keys)).toThrow('Incomplete expression');
    },
  );

  it('AC-026 rejects an empty expression', () => {
    expect(() => parse([])).toThrow('Incomplete expression');
  });

  it('AC-026 rejects items that cannot follow each other', () => {
    // The reducer never produces these; the parser must still not accept them.
    expect(() => parse([{ type: 'number', text: '2' }, { type: 'number', text: '3' }])).toThrow(
      'Incomplete expression',
    );
    expect(() => parse([{ type: 'number', text: '2' }, { type: 'rparen' }])).toThrow(
      'Incomplete expression',
    );
    expect(() => parse([{ type: 'operator', op: 'add' }, { type: 'number', text: '2' }])).toThrow(
      'Incomplete expression',
    );
    expect(() =>
      parse([{ type: 'lparen' }, { type: 'number', text: '2' }, { type: 'number', text: '3' }]),
    ).toThrow('Incomplete expression');
  });
});
