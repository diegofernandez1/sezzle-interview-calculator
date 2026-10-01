import { describe, expect, it } from 'vitest';
import { KEYPAD, keyToAction } from './keys';
import type { Action } from './types';

describe('KEYPAD', () => {
  const byName = new Map(KEYPAD.map((key) => [key.name, key]));

  it('AC-048 has a button for every digit and the decimal point', () => {
    for (const digit of '0123456789') {
      expect(byName.get(digit)?.action).toEqual({ type: 'digit', digit });
    }
    expect(byName.get('decimal point')?.action).toEqual({ type: 'decimal' });
  });

  it('AC-048 has a button for every operation of the service', () => {
    const operations: [string, Action][] = [
      ['add', { type: 'operator', op: 'add' }],
      ['subtract', { type: 'operator', op: 'subtract' }],
      ['multiply', { type: 'operator', op: 'multiply' }],
      ['divide', { type: 'operator', op: 'divide' }],
      ['power', { type: 'operator', op: 'exponent' }],
      ['as a percentage of', { type: 'operator', op: 'percentage' }],
      ['square root', { type: 'sqrt' }],
    ];
    for (const [name, action] of operations) {
      expect(byName.get(name)?.action).toEqual(action);
    }
  });

  it('AC-048 has parentheses, equals, backspace, and clear', () => {
    expect(byName.get('open parenthesis')?.action).toEqual({ type: 'lparen' });
    expect(byName.get('close parenthesis')?.action).toEqual({ type: 'rparen' });
    expect(byName.get('equals')?.action).toEqual({ type: 'equals' });
    expect(byName.get('backspace')?.action).toEqual({ type: 'backspace' });
    expect(byName.get('clear')?.action).toEqual({ type: 'clear' });
  });

  it('AC-075 has buttons that move the cursor', () => {
    expect(byName.get('move cursor left')?.action).toEqual({ type: 'moveCursor', to: 'left' });
    expect(byName.get('move cursor right')?.action).toEqual({ type: 'moveCursor', to: 'right' });
  });

  it('AC-048 has 25 buttons with unique names and labels', () => {
    // 10 digits, the decimal point, 7 operations, 2 parentheses, equals,
    // backspace, clear, and 2 cursor buttons: a full grid of 5 by 5.
    expect(KEYPAD).toHaveLength(25);
    expect(new Set(KEYPAD.map((key) => key.name)).size).toBe(25);
    expect(new Set(KEYPAD.map((key) => key.label)).size).toBe(25);
  });

  it('FR-025 gives every button a keyboard key that does the same thing', () => {
    for (const key of KEYPAD) {
      expect(keyToAction(key.shortcut), `shortcut of ${key.name}`).toEqual(key.action);
    }
  });
});

describe('keyToAction', () => {
  it.each('0123456789'.split(''))('AC-042 maps %s to its digit', (digit) => {
    expect(keyToAction(digit)).toEqual({ type: 'digit', digit });
  });

  it.each<[string, Action]>([
    ['.', { type: 'decimal' }],
    [',', { type: 'decimal' }],
    ['+', { type: 'operator', op: 'add' }],
    ['-', { type: 'operator', op: 'subtract' }],
    ['*', { type: 'operator', op: 'multiply' }],
    ['x', { type: 'operator', op: 'multiply' }],
    ['X', { type: 'operator', op: 'multiply' }],
    ['/', { type: 'operator', op: 'divide' }],
    ['^', { type: 'operator', op: 'exponent' }],
    ['%', { type: 'operator', op: 'percentage' }],
    ['r', { type: 'sqrt' }],
    ['R', { type: 'sqrt' }],
    ['(', { type: 'lparen' }],
    [')', { type: 'rparen' }],
    ['Enter', { type: 'equals' }],
    ['=', { type: 'equals' }],
    ['Backspace', { type: 'backspace' }],
    ['Escape', { type: 'clear' }],
    ['Delete', { type: 'clear' }],
    ['ArrowLeft', { type: 'moveCursor', to: 'left' }],
    ['ArrowRight', { type: 'moveCursor', to: 'right' }],
    ['Home', { type: 'moveCursor', to: 'start' }],
    ['End', { type: 'moveCursor', to: 'end' }],
  ])('AC-044 maps %s', (key, action) => {
    expect(keyToAction(key)).toEqual(action);
  });

  it.each(['a', 'Tab', 'Shift', ' ', 'ArrowUp', 'F5'])('FR-025 ignores %s', (key) => {
    expect(keyToAction(key)).toBeNull();
  });
});
