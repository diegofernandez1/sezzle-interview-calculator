import { expect, test, type ServiceCall } from './calculatorPage';

// E2E-01 and E2E-02 of specs/004-end-to-end-tests/spec.md. Test names start
// with the scenario of specs/002-calculator-frontend/spec.md they verify.

const call = (operation: string, body: unknown): ServiceCall => ({ operation, body });

test.describe('E2E-01 each operation', () => {
  const operations: [string, string, string, ServiceCall][] = [
    ['AC-013 add', '2 + 3 =', '5', call('add', { numbers: [2, 3] })],
    ['AC-015 subtract', '1 0 − 3 − 2 =', '5', call('subtract', { numbers: [10, 3, 2] })],
    ['AC-018 multiply', '2 × 3 × 4 =', '24', call('multiply', { numbers: [2, 3, 4] })],
    ['AC-018 divide', '1 0 0 ÷ 5 ÷ 2 =', '10', call('divide', { numbers: [100, 5, 2] })],
    ['AC-019 exponent', '2 xʸ 1 0 =', '1024', call('exponent', { base: 2, exponent: 10 })],
    ['AC-020 square root', '√ 9 =', '3', call('square_root', { number: 9 })],
    ['AC-021 percentage', '2 5 % 2 0 0 =', '12.5', call('percentage', { value: 25, total: 200 })],
  ];

  for (const [name, labels, result, expected] of operations) {
    test(`${name}: ${labels} gives ${result}`, async ({ calculator }) => {
      await calculator.press(labels);

      await expect(calculator.display).toHaveText(result);
      expect(calculator.calls).toEqual([expected]);
    });
  }

  test('AC-052 requests are JSON posts to the service', async ({ calculator, page }) => {
    const request = page.waitForRequest('**/api/v1/add');
    await calculator.press('2 + 3 =');

    const sent = await request;
    expect(sent.method()).toBe('POST');
    expect(sent.headers()['content-type']).toBe('application/json');
    const response = await sent.response();
    expect(response?.status()).toBe(200);
    expect(await response?.json()).toEqual({ operation: 'add', result: 5 });
  });
});

test.describe('E2E-02 chained operations', () => {
  const chains: [string, string, string, ServiceCall[]][] = [
    ['AC-014 a run of additions is one request', '1 + 2 + 3 =', '6', [call('add', { numbers: [1, 2, 3] })]],
    [
      'AC-016 multiplication before addition',
      '2 + 3 × 4 =',
      '14',
      [call('multiply', { numbers: [3, 4] }), call('add', { numbers: [2, 12] })],
    ],
    [
      'AC-017 a new request when the operator changes',
      '1 0 − 3 + 2 =',
      '9',
      [call('subtract', { numbers: [10, 3] }), call('add', { numbers: [7, 2] })],
    ],
    [
      'AC-019 exponents from right to left',
      '2 xʸ 3 xʸ 2 =',
      '512',
      [call('exponent', { base: 3, exponent: 2 }), call('exponent', { base: 2, exponent: 9 })],
    ],
    [
      'AC-020 square root of a group',
      '√ ( 9 + 7 ) =',
      '4',
      [call('add', { numbers: [9, 7] }), call('square_root', { number: 16 })],
    ],
    [
      'AC-022 parentheses first',
      '( 2 + 3 ) × 4 =',
      '20',
      [call('add', { numbers: [2, 3] }), call('multiply', { numbers: [5, 4] })],
    ],
    [
      'AC-023 exponent before a negative sign',
      '− 2 xʸ 2 =',
      '−4',
      [call('exponent', { base: 2, exponent: 2 }), call('multiply', { numbers: [-1, 4] })],
    ],
    ['AC-023 a negative operand needs no extra request', '2 × − 3 =', '−6', [call('multiply', { numbers: [2, -3] })]],
    ['AC-024 an open parenthesis is closed', '( 2 + 3 =', '5', [call('add', { numbers: [2, 3] })]],
    ['AC-025 a single number needs no request', '5 =', '5', []],
    [
      'AC-058 every level of the order of operations',
      '1 0 0 − 2 xʸ 3 × 5 + √ 8 1 ÷ 3 =',
      '63',
      [
        call('exponent', { base: 2, exponent: 3 }),
        call('multiply', { numbers: [8, 5] }),
        call('subtract', { numbers: [100, 40] }),
        call('square_root', { number: 81 }),
        call('divide', { numbers: [9, 3] }),
        call('add', { numbers: [60, 3] }),
      ],
    ],
  ];

  for (const [name, labels, result, expected] of chains) {
    test(`${name}: ${labels} gives ${result}`, async ({ calculator }) => {
      await calculator.press(labels);

      await expect(calculator.display).toHaveText(result);
      expect(calculator.calls).toEqual(expected);
      await expect(calculator.message).toBeHidden();
    });
  }

  const precedence: [string, string][] = [
    ['1 0 − 4 ÷ 2 =', '8'],
    ['8 ÷ 2 × 4 =', '16'],
    ['2 × 3 xʸ 2 =', '18'],
    ['( − 3 ) xʸ 2 =', '9'],
    ['2 × ( 3 + ( 4 − 1 ) × 2 ) =', '18'],
    ['1 + 2 × 3 − 4 ÷ 2 =', '5'],
    ['5 0 + 2 5 % 2 0 0 =', '62.5'],
  ];

  for (const [labels, result] of precedence) {
    test(`AC-058 order of operations: ${labels} gives ${result}`, async ({ calculator }) => {
      await calculator.press(labels);

      await expect(calculator.display).toHaveText(result);
    });
  }
});
