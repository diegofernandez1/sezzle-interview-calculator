/** Operations the service computes over a list of numbers. */
export type ListOp = 'add' | 'subtract' | 'multiply' | 'divide';

/** Operations written between two operands. */
export type BinaryOp = ListOp | 'exponent' | 'percentage';

/** One item of the expression being entered. */
export type Token =
  // `text` is what was typed, or the rounded form of a result. A result also
  // carries `value`, the exact number from the service.
  | { type: 'number'; text: string; value?: number }
  | { type: 'operator'; op: BinaryOp }
  | { type: 'negate' }
  | { type: 'sqrt' }
  | { type: 'lparen' }
  | { type: 'rparen' };

/** What a keypad button or a keyboard key asks for. */
export type Action =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; op: BinaryOp }
  | { type: 'sqrt' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'equals' };

/** A parsed expression. Each node other than `number` is one service call. */
export type Node =
  | { kind: 'number'; value: number }
  | { kind: 'list'; op: ListOp; operands: Node[] }
  | { kind: 'exponent'; base: Node; exponent: Node }
  | { kind: 'percentage'; value: Node; total: Node }
  | { kind: 'sqrt'; operand: Node }
  | { kind: 'negate'; operand: Node };

/** The calculate service, one method per endpoint. */
export interface CalculatorApi {
  add(numbers: number[]): Promise<number>;
  subtract(numbers: number[]): Promise<number>;
  multiply(numbers: number[]): Promise<number>;
  divide(numbers: number[]): Promise<number>;
  exponent(base: number, exponent: number): Promise<number>;
  squareRoot(number: number): Promise<number>;
  percentage(value: number, total: number): Promise<number>;
}
