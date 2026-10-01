import type { CalculatorApi, Node } from './types';

/**
 * Computes the value of an expression tree. Every operation is one call to
 * the service; nothing is calculated here.
 *
 * Operands are evaluated one at a time, from left to right, so the calls
 * happen in a fixed order and the first failure stops the rest.
 */
export async function evaluate(node: Node, api: CalculatorApi): Promise<number> {
  switch (node.kind) {
    case 'number':
      return node.value;

    case 'list': {
      const numbers: number[] = [];
      for (const operand of node.operands) {
        numbers.push(await evaluate(operand, api));
      }
      return api[node.op](numbers);
    }

    case 'exponent': {
      const base = await evaluate(node.base, api);
      const exponent = await evaluate(node.exponent, api);
      return api.exponent(base, exponent);
    }

    case 'percentage': {
      const value = await evaluate(node.value, api);
      const total = await evaluate(node.total, api);
      return api.percentage(value, total);
    }

    case 'sqrt':
      return api.squareRoot(await evaluate(node.operand, api));

    case 'negate':
      return api.multiply([-1, await evaluate(node.operand, api)]);
  }
}
