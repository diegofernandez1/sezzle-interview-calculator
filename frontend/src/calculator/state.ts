import { formatNumber, formatTokens, unitCount } from './format';
import type { Action, BinaryOp, Token } from './types';

const MAX_DIGITS = 15;

export interface CalculatorState {
  /** The expression being entered, or the result after an evaluation. */
  tokens: Token[];
  /**
   * Where input goes: the number of items left of the cursor. An item is one
   * character of a typed number, or any other token; see `formatUnits`.
   */
  cursor: number;
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
  cursor: 0,
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
        cursor: 1,
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

  switch (event.type) {
    case 'clear':
      return initialState;
    case 'moveCursor':
      return moveCursor(state, cursorTarget(state, event.to));
    case 'placeCursor':
      return moveCursor(state, event.position);
  }

  if (state.evaluated) return editResult(state, event);

  const [left, right] = splitAt(state.tokens, state.cursor);
  const edited = edit(left, event);
  // An action the rules ignore leaves everything in place.
  const joined = edited === left || event.type === 'backspace' ? right : joinAfterInsert(edited, right);
  return {
    ...state,
    tokens: normalize([...edited, ...joined]),
    cursor: countUnits(edited),
    error: null,
  };
}

type EditAction = Exclude<Action, { type: 'equals' | 'clear' | 'moveCursor' | 'placeCursor' }>;

function countUnits(tokens: Token[]): number {
  return tokens.reduce((count, token) => count + unitCount(token), 0);
}

function cursorTarget(state: CalculatorState, to: 'left' | 'right' | 'start' | 'end'): number {
  switch (to) {
    case 'left':
      return state.cursor - 1;
    case 'right':
      return state.cursor + 1;
    case 'start':
      return 0;
    case 'end':
      return countUnits(state.tokens);
  }
}

/** Moves the cursor, keeping it inside the expression. */
function moveCursor(state: CalculatorState, position: number): CalculatorState {
  const cursor = Math.max(0, Math.min(position, countUnits(state.tokens)));
  return cursor === state.cursor ? state : { ...state, cursor };
}

/**
 * Splits the expression at the cursor. A cursor inside a typed number splits
 * that number in two.
 */
function splitAt(tokens: Token[], cursor: number): [Token[], Token[]] {
  let remaining = cursor;
  for (const [index, token] of tokens.entries()) {
    const units = unitCount(token);
    if (remaining === 0) return [tokens.slice(0, index), tokens.slice(index)];
    if (remaining < units && isTypedNumber(token)) {
      const before: Token = { type: 'number', text: token.text.slice(0, remaining) };
      const after: Token = { type: 'number', text: token.text.slice(remaining) };
      return [[...tokens.slice(0, index), before], [after, ...tokens.slice(index + 1)]];
    }
    remaining -= units;
  }
  return [tokens, []];
}

/**
 * Makes the part right of the cursor fit what was just inserted on its left:
 * an operator typed before an operator replaces it, and an operand typed
 * before an operand gets a multiplication between them. Two typed numbers
 * are left alone; `normalize` joins them.
 */
function joinAfterInsert(left: Token[], right: Token[]): Token[] {
  const before = left.at(-1);
  const after = right[0];
  if (!before || !after) return right;

  if (before.type === 'operator' && after.type === 'operator') {
    return right.slice(1);
  }

  const endsOperand = before.type === 'number' || before.type === 'rparen';
  const startsOperand = after.type === 'number' || after.type === 'lparen' || after.type === 'sqrt';
  const bothTyped = isTypedNumber(before) && isTypedNumber(after);
  if (endsOperand && startsOperand && !bothTyped) {
    return [{ type: 'operator', op: 'multiply' }, ...right];
  }
  return right;
}

function isTypedNumber(token: Token): token is { type: 'number'; text: string } {
  return token.type === 'number' && token.value === undefined;
}

/**
 * Tidies the expression after an edit in the middle:
 *
 * - two typed numbers side by side become one number, with one decimal point;
 * - a minus is a subtraction after an operand and a negative sign otherwise.
 */
function normalize(tokens: Token[]): Token[] {
  const result: Token[] = [];
  for (const token of tokens) {
    const previous = result.at(-1);

    if (previous && isTypedNumber(previous) && isTypedNumber(token)) {
      const rest = previous.text.includes('.') ? token.text.replaceAll('.', '') : token.text;
      result[result.length - 1] = { type: 'number', text: previous.text + rest };
      continue;
    }

    const isMinus = token.type === 'negate' || (token.type === 'operator' && token.op === 'subtract');
    if (isMinus) {
      const afterOperand = previous?.type === 'number' || previous?.type === 'rparen';
      result.push(afterOperand ? { type: 'operator', op: 'subtract' } : { type: 'negate' });
      continue;
    }

    result.push(token);
  }
  return result;
}

/** The first input after a result: continue from it, or start again. */
function editResult(state: CalculatorState, action: EditAction): CalculatorState {
  if (action.type === 'rparen') return state;

  const tokens = ((): Token[] => {
    switch (action.type) {
      case 'operator':
        return edit(state.tokens, action);
      case 'sqrt':
        return [{ type: 'sqrt' }, ...state.tokens];
      case 'backspace':
        return [];
      default:
        return edit([], action);
    }
  })();
  return { ...state, tokens, cursor: countUnits(tokens), previous: null, evaluated: false };
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
