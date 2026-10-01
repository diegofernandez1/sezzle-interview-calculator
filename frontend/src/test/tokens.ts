import { keyToAction } from '../calculator/keys';
import { initialState, reducer, type CalculatorState } from '../calculator/state';
import type { Token } from '../calculator/types';

/**
 * Feeds keyboard keys to the reducer, one character per key, and returns the
 * state. Spaces are skipped, so 'r(9+7)' and 'r ( 9 + 7 )' are the same.
 */
export function typed(keys: string, state: CalculatorState = initialState): CalculatorState {
  for (const key of keys.replaceAll(' ', '')) {
    const action = keyToAction(key);
    if (!action) throw new Error(`no action for key "${key}"`);
    state = reducer(state, action);
  }
  return state;
}

/** The tokens produced by typing keys on an empty calculator. */
export function tokens(keys: string): Token[] {
  return typed(keys).tokens;
}
