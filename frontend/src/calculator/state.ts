import { formatNumber, formatTokens } from './format';
import type { Action, BinaryOp, Token } from './types';

const MAX_DIGITS = 15;

export interface CalculatorState {
  /** The expression being entered, or the result after an evaluation. */
  tokens: Token[];
  /** The last evaluated expression, shown above its result. */
  previous: string | null;
  /** The message of the last failure. */
  error: string | null;
  /** An evaluation is in progress. */
  pending: boolean;
  /** The tokens are a result that has not been edited yet. */
  evaluated: boolean;
}

/** What can happen to the state: an input action, or the outcome of an evaluation. */
export type CalculatorEvent =
  | Action
  | { type: 'evaluationStarted' }
  | { type: 'evaluationSucceeded'; result: number }
  | { type: 'evaluationFailed'; message: string };

export const initialState: CalculatorState = {
  tokens: [],
  previous: null,
  error: null,
  pending: false,
  evaluated: false,
};

export function reducer(state: CalculatorState, event: CalculatorEvent): CalculatorState {
  switch (event.type) {
    case 'evaluationStarted':
      return { ...state, pending: true, error: null };
    case 'evaluationSucceeded':
      return {
        tokens: [{ type: 'number', text: formatNumber(event.result), value: event.result }],
        previous: `${formatTokens(state.tokens)} =`,
        error: null,
        pending: false,
        evaluated: true,
      };
    case 'evaluationFailed':
      return { ...state, pending: false, error: event.message };
    case 'equals':
      // Evaluating needs the service, so the caller handles it.
      return state;
  }

  if (state.pending) return state;
  if (event.type === 'clear') return initialState;
  if (state.evaluated) return editResult(state, event);

  return { ...state, tokens: edit(state.tokens, event), error: null };
}

type EditAction = Exclude<Action, { type: 'equals' | 'clear' }>;

/** The first input after a result: continue from it, or start again. */
function editResult(state: CalculatorState, action: EditAction): CalculatorState {
  const edited = { ...state, previous: null, evaluated: false };
  switch (action.type) {
    case 'operator':
      return { ...edited, tokens: edit(state.tokens, action) };
    case 'sqrt':
      return { ...edited, tokens: [{ type: 'sqrt' }, ...state.tokens] };
    case 'rparen':
      return state;
    case 'backspace':
      return { ...edited, tokens: [] };
    default:
      return { ...edited, tokens: edit([], action) };
  }
}

/** Applies one input action to the expression, following the input rules. */
function edit(tokens: Token[], action: EditAction): Token[] {
  const last = tokens.at(-1);
  const endsWithOperand = last?.type === 'number' || last?.type === 'rparen';

  switch (action.type) {
    case 'digit':
      return startOrExtendNumber(tokens, action.digit, (text) => {
        if (text === '0') return action.digit;
        if (countDigits(text) >= MAX_DIGITS) return text;
        return text + action.digit;
      });

    case 'decimal':
      return startOrExtendNumber(tokens, '0.', (text) => (text.includes('.') ? text : `${text}.`));

    case 'operator':
      return applyOperator(tokens, action.op);

    case 'sqrt':
    case 'lparen': {
      const opening: Token = { type: action.type };
      return endsWithOperand
        ? [...closeNumber(tokens), { type: 'operator', op: 'multiply' }, opening]
        : [...tokens, opening];
    }

    case 'rparen':
      return endsWithOperand && openParentheses(tokens) > 0
        ? [...closeNumber(tokens), { type: 'rparen' }]
        : tokens;

    case 'backspace':
      // A carried result is removed whole; its text is not what was typed.
      if (last?.type === 'number' && last.value === undefined && last.text.length > 1) {
        return [...tokens.slice(0, -1), { type: 'number', text: last.text.slice(0, -1) }];
      }
      return tokens.slice(0, -1);
  }
}

/**
 * Types into the number at the end of the expression, or starts a new number
 * with `first`. A number directly after `)` is multiplied, and a number typed
 * over a carried result replaces it.
 */
function startOrExtendNumber(tokens: Token[], first: string, extend: (text: string) => string): Token[] {
  const last = tokens.at(-1);
  if (last?.type === 'number') {
    const text = last.value === undefined ? extend(last.text) : first;
    return [...tokens.slice(0, -1), { type: 'number', text }];
  }
  if (last?.type === 'rparen') {
    return [...tokens, { type: 'operator', op: 'multiply' }, { type: 'number', text: first }];
  }
  return [...tokens, { type: 'number', text: first }];
}

function applyOperator(tokens: Token[], op: BinaryOp): Token[] {
  const last = tokens.at(-1);
  const operator: Token = { type: 'operator', op };
  const negate: Token = { type: 'negate' };

  switch (last?.type) {
    case undefined:
      return op === 'subtract' ? [negate] : [{ type: 'number', text: '0' }, operator];
    case 'number':
    case 'rparen':
      return [...closeNumber(tokens), operator];
    case 'operator': {
      // After + or −, a minus replaces the operator. After the others it is
      // the sign of the next operand.
      const signFollows = last.op !== 'add' && last.op !== 'subtract';
      return op === 'subtract' && signFollows ? [...tokens, negate] : [...tokens.slice(0, -1), operator];
    }
    case 'lparen':
    case 'sqrt':
      return op === 'subtract' ? [...tokens, negate] : tokens;
    case 'negate':
      return tokens;
  }
}

/** Drops the decimal point of a number that ends with one, as in `2.`. */
function closeNumber(tokens: Token[]): Token[] {
  const last = tokens.at(-1);
  if (last?.type === 'number' && last.text.endsWith('.')) {
    return [...tokens.slice(0, -1), { ...last, text: last.text.slice(0, -1) }];
  }
  return tokens;
}

function openParentheses(tokens: Token[]): number {
  return tokens.reduce((open, token) => {
    if (token.type === 'lparen') return open + 1;
    if (token.type === 'rparen') return open - 1;
    return open;
  }, 0);
}

function countDigits(text: string): number {
  return text.replace('.', '').length;
}
