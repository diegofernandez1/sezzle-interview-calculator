import type { Action, BinaryOp } from './types';

/** One keypad button. */
export interface KeyDef {
  /** The text on the button. */
  label: string;
  /** The accessible name, which says what the button does. */
  name: string;
  /** Decides the color: digits, operators, and equals differ. */
  kind: 'digit' | 'operator' | 'equals';
  action: Action;
  /** The keyboard key that does the same thing. */
  shortcut: string;
  /** How many grid columns or rows the button covers, when more than one. */
  columns?: number;
  rows?: number;
}

const digit = (d: string): KeyDef => ({
  label: d,
  name: d,
  kind: 'digit',
  action: { type: 'digit', digit: d },
  shortcut: d,
});

const operator = (label: string, name: string, op: BinaryOp, shortcut: string): KeyDef => ({
  label,
  name,
  kind: 'operator',
  action: { type: 'operator', op },
  shortcut,
});

/**
 * The keypad in grid order, five columns wide:
 *
 *   (     )     % of   ⌫     AC
 *   7     8     9      ÷     √
 *   4     5     6      ×     xʸ
 *   1     2     3      −     =
 *   0     0     .      +     =
 */
export const KEYPAD: KeyDef[] = [
  { label: '(', name: 'open parenthesis', kind: 'operator', action: { type: 'lparen' }, shortcut: '(' },
  { label: ')', name: 'close parenthesis', kind: 'operator', action: { type: 'rparen' }, shortcut: ')' },
  operator('% of', 'as a percentage of', 'percentage', '%'),
  { label: '⌫', name: 'backspace', kind: 'operator', action: { type: 'backspace' }, shortcut: 'Backspace' },
  { label: 'AC', name: 'clear', kind: 'operator', action: { type: 'clear' }, shortcut: 'Escape' },

  digit('7'),
  digit('8'),
  digit('9'),
  operator('÷', 'divide', 'divide', '/'),
  { label: '√', name: 'square root', kind: 'operator', action: { type: 'sqrt' }, shortcut: 'r' },

  digit('4'),
  digit('5'),
  digit('6'),
  operator('×', 'multiply', 'multiply', '*'),
  operator('xʸ', 'power', 'exponent', '^'),

  digit('1'),
  digit('2'),
  digit('3'),
  operator('−', 'subtract', 'subtract', '-'),
  { label: '=', name: 'equals', kind: 'equals', action: { type: 'equals' }, shortcut: 'Enter', rows: 2 },

  { ...digit('0'), columns: 2 },
  { label: '.', name: 'decimal point', kind: 'digit', action: { type: 'decimal' }, shortcut: '.' },
  operator('+', 'add', 'add', '+'),
];

const KEYBOARD: Record<string, Action> = {
  '.': { type: 'decimal' },
  ',': { type: 'decimal' },
  '+': { type: 'operator', op: 'add' },
  '-': { type: 'operator', op: 'subtract' },
  '*': { type: 'operator', op: 'multiply' },
  x: { type: 'operator', op: 'multiply' },
  X: { type: 'operator', op: 'multiply' },
  '/': { type: 'operator', op: 'divide' },
  '^': { type: 'operator', op: 'exponent' },
  '%': { type: 'operator', op: 'percentage' },
  r: { type: 'sqrt' },
  R: { type: 'sqrt' },
  '(': { type: 'lparen' },
  ')': { type: 'rparen' },
  Enter: { type: 'equals' },
  '=': { type: 'equals' },
  Backspace: { type: 'backspace' },
  Escape: { type: 'clear' },
  Delete: { type: 'clear' },
};

/** The action for a keyboard key (`KeyboardEvent.key`), or null if it has none. */
export function keyToAction(key: string): Action | null {
  if (key.length === 1 && key >= '0' && key <= '9') {
    return { type: 'digit', digit: key };
  }
  return Object.hasOwn(KEYBOARD, key) ? KEYBOARD[key] : null;
}
