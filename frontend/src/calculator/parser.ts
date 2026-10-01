import type { ListOp, Node, Token } from './types';

/** Thrown for an expression that cannot be evaluated, such as `2 +`. */
export class ExpressionError extends Error {
  constructor() {
    super('Incomplete expression');
    this.name = 'ExpressionError';
  }
}

/**
 * Turns the tokens of an expression into a tree, by recursive descent:
 *
 *   expression := term (('+' | '−') term)*
 *   term       := unary (('×' | '÷' | '% of') unary)*
 *   unary      := '−' unary | power
 *   power      := primary ('^' unary)?
 *   primary    := number | '(' expression ')' | '√' '−'? primary
 *
 * Parentheses still open at the end are closed. Throws ExpressionError for
 * anything else that does not fit the grammar.
 */
export function parse(tokens: Token[]): Node {
  let position = 0;

  const peek = (): Token | undefined => tokens[position];
  const next = (): Token | undefined => tokens[position++];

  /** Consumes and returns the next token if it is one of these operators. */
  function operatorIn<Op extends string>(ops: readonly Op[]): Op | null {
    const token = peek();
    if (token?.type === 'operator' && (ops as readonly string[]).includes(token.op)) {
      position++;
      return token.op as Op;
    }
    return null;
  }

  function expression(): Node {
    let left = term();
    for (let op = operatorIn(['add', 'subtract'] as const); op; op = operatorIn(['add', 'subtract'] as const)) {
      left = extendList(left, op, term());
    }
    return left;
  }

  function term(): Node {
    const ops = ['multiply', 'divide', 'percentage'] as const;
    let left = unary();
    for (let op = operatorIn(ops); op; op = operatorIn(ops)) {
      const right = unary();
      left = op === 'percentage' ? { kind: 'percentage', value: left, total: right } : extendList(left, op, right);
    }
    return left;
  }

  function unary(): Node {
    if (peek()?.type === 'negate') {
      position++;
      return negated(unary());
    }
    return power();
  }

  function power(): Node {
    const base = primary();
    if (operatorIn(['exponent'] as const)) {
      // Parsing the exponent with unary() makes ^ apply from right to left
      // and allows a negative exponent.
      return { kind: 'exponent', base, exponent: unary() };
    }
    return base;
  }

  function primary(): Node {
    const token = next();
    switch (token?.type) {
      case 'number':
        return { kind: 'number', value: token.value ?? Number(token.text) };
      case 'lparen': {
        const inner = expression();
        // A missing ) is fine at the end of the input, and only there.
        if (peek()?.type === 'rparen') {
          position++;
        } else if (peek() !== undefined) {
          throw new ExpressionError();
        }
        return inner;
      }
      case 'sqrt':
        if (peek()?.type === 'negate') {
          position++;
          return { kind: 'sqrt', operand: negated(primary()) };
        }
        return { kind: 'sqrt', operand: primary() };
      default:
        throw new ExpressionError();
    }
  }

  const tree = expression();
  if (position < tokens.length) throw new ExpressionError();
  return tree;
}

/**
 * Adds an operand to a run of the same list operation, so that `1 + 2 + 3`
 * is one node, and one request, with three operands. These operations apply
 * from left to right, so extending the left side never changes the meaning.
 */
function extendList(left: Node, op: ListOp, right: Node): Node {
  if (left.kind === 'list' && left.op === op) {
    return { ...left, operands: [...left.operands, right] };
  }
  return { kind: 'list', op, operands: [left, right] };
}

/** A negative sign on a number is a negative number; on anything else, a node. */
function negated(operand: Node): Node {
  if (operand.kind === 'number') {
    return { kind: 'number', value: -operand.value };
  }
  return { kind: 'negate', operand };
}
