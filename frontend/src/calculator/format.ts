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

/** The expression as shown on the display. An empty expression shows 0. */
export function formatTokens(tokens: Token[]): string {
  if (tokens.length === 0) return '0';

  const text = tokens
    .map((token) => {
      switch (token.type) {
        case 'number':
          return token.text.replace('-', MINUS);
        case 'operator':
          return ` ${OPERATOR_SYMBOLS[token.op]} `;
        case 'negate':
          return MINUS;
        case 'sqrt':
          return '√';
        case 'lparen':
          return '(';
        case 'rparen':
          return ')';
      }
    })
    .join('');
  return text.trim();
}
