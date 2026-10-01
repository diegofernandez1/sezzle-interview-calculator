import { formatUnits } from '../calculator/format';
import { keyToAction } from '../calculator/keys';
import { initialState, reducer, type CalculatorState } from '../calculator/state';
import type { Action, Token } from '../calculator/types';

/** Characters that stand for keys with longer names. */
const SPECIAL: Record<string, Action> = {
  '<': { type: 'moveCursor', to: 'left' },
  '>': { type: 'moveCursor', to: 'right' },
  '[': { type: 'moveCursor', to: 'start' },
  ']': { type: 'moveCursor', to: 'end' },
  '~': { type: 'backspace' },
};

/**
 * Feeds keyboard keys to the reducer, one character per key, and returns the
 * state. Spaces are skipped, so 'r(9+7)' and 'r ( 9 + 7 )' are the same.
 * `<` and `>` move the cursor, `[` and `]` send it to the start and the end,
 * and `~` is backspace.
 */
export function typed(keys: string, state: CalculatorState = initialState): CalculatorState {
  for (const key of keys.replaceAll(' ', '')) {
    const action = SPECIAL[key] ?? keyToAction(key);
    if (!action) throw new Error(`no action for key "${key}"`);
    state = reducer(state, action);
  }
  return state;
}

/** The tokens produced by typing keys on an empty calculator. */
export function tokens(keys: string): Token[] {
  return typed(keys).tokens;
}

/** The display text with `‸` at the cursor, as written in the spec. */
export function withCursor(state: Pick<CalculatorState, 'tokens' | 'cursor'>): string {
  const units = formatUnits(state.tokens);
  if (units.length === 0) return '0‸';
  return [...units.slice(0, state.cursor), '‸', ...units.slice(state.cursor)].join('');
}
