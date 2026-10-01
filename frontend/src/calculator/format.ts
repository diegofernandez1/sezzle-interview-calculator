import type { BinaryOp, Token } from './types';

const MINUS = '−';

const OPERATOR_SYMBOLS: Record<BinaryOp, string> = {
  add: '+',
  subtract: MINUS,
  multiply: '×',
  divide: '÷',
  exponent: '^',
  percentage: '% of',
};

/**
 * The text of a result. Whole numbers of up to 15 digits are exact; anything
 * else is rounded to 12 significant digits, which hides floating-point noise
 * such as 0.30000000000000004.
 */
export function formatNumber(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) {
    return String(value);
  }
  return String(Number(value.toPrecision(12)));
}

/**
 * The display text of one token, split into the items the cursor steps over.
 * A typed number is one item per character, so the cursor can go inside it.
 * Everything else, including a carried result, is a single item.
 */
function tokenUnits(token: Token): string[] {
  switch (token.type) {
    case 'number':
      return token.value === undefined ? [...token.text] : [token.text.replace('-', MINUS)];
    case 'operator':
      return [` ${OPERATOR_SYMBOLS[token.op]} `];
    case 'negate':
      return [MINUS];
    case 'sqrt':
      return ['√'];
    case 'lparen':
      return ['('];
    case 'rparen':
      return [')'];
  }
}

/** How many cursor positions a token spans. */
export function unitCount(token: Token): number {
  return token.type === 'number' && token.value === undefined ? token.text.length : 1;
}

/** The expression as the list of items the cursor steps over, in display text. */
export function formatUnits(tokens: Token[]): string[] {
  return tokens.flatMap(tokenUnits);
}

/** The expression as shown on the display. An empty expression shows 0. */
export function formatTokens(tokens: Token[]): string {
  return formatUnits(tokens).join('').trim() || '0';
}
