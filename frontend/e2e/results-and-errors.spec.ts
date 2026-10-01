import { expect, test } from './calculatorPage';

// E2E-03, E2E-04, and E2E-05 of specs/004-end-to-end-tests/spec.md.

test.describe('E2E-03 results', () => {
  test('AC-027 the evaluated expression is shown above the result', async ({ calculator, page }) => {
    await calculator.press('2 + 3 =');

    await expect(calculator.display).toHaveText('5');
    await expect(page.getByText('2 + 3 =', { exact: true })).toBeVisible();
  });

  test('AC-028 a result is rounded for display', async ({ calculator }) => {
    await calculator.press('0 . 1 + 0 . 2 =');

    await expect(calculator.display).toHaveText('0.3');
  });

  test('AC-029 an operator continues from the exact result', async ({ calculator }) => {
    await calculator.press('0 . 1 + 0 . 2 = × 1 0 =');

    expect(calculator.calls[1]).toEqual({ operation: 'multiply', body: { numbers: [0.30000000000000004, 10] } });
    await expect(calculator.display).toHaveText('3');
  });

  test('AC-030 a digit starts a new expression', async ({ calculator, page }) => {
    await calculator.press('2 + 3 = 7');

    await expect(calculator.display).toHaveText('7');
    await expect(page.getByText('2 + 3 =', { exact: true })).toBeHidden();
  });

  test('AC-031 square root applies to the result', async ({ calculator }) => {
    await calculator.press('7 + 9 = √');
    await expect(calculator.display).toHaveText('√16');
    await calculator.press('=');

    await expect(calculator.display).toHaveText('4');
    expect(calculator.calls[1]).toEqual({ operation: 'square_root', body: { number: 16 } });
  });

  test('AC-032 backspace clears a result', async ({ calculator }) => {
    await calculator.press('2 + 3 = ⌫');

    await expect(calculator.display).toHaveText('0');
  });

  test('AC-033 equals does nothing after a result', async ({ calculator }) => {
    await calculator.press('2 + 3 = =');

    await expect(calculator.display).toHaveText('5');
    expect(calculator.calls).toHaveLength(1);
  });

  test('AC-012 clear removes the expression, the result, and the message', async ({ calculator, page }) => {
    await calculator.press('2 + 3 = AC');
    await expect(calculator.display).toHaveText('0');
    await expect(page.getByText('2 + 3 =', { exact: true })).toBeHidden();

    await calculator.press('1 ÷ 0 = AC');
    await expect(calculator.display).toHaveText('0');
    await expect(calculator.message).toBeHidden();
  });
});

test.describe('E2E-04 errors', () => {
  const serviceErrors: [string, string, string, string][] = [
    ['AC-034', '1 0 ÷ 0 =', "Can't divide by zero", '10 ÷ 0'],
    ['AC-034', '2 5 % 0 =', "Can't divide by zero", '25 % of 0'],
    ['AC-035', '√ − 4 =', "Can't take the square root of a negative number", '√−4'],
    ['AC-036', '( − 8 ) xʸ 0 . 5 =', 'The result is not a real number', '(−8) ^ 0.5'],
    ['AC-036', '1 0 xʸ 4 0 0 =', 'The result is too large', '10 ^ 400'],
  ];

  for (const [id, labels, message, kept] of serviceErrors) {
    test(`${id} ${labels} shows "${message}" and keeps the expression`, async ({ calculator }) => {
      await calculator.press(labels);

      await expect(calculator.message).toHaveText(message);
      await expect(calculator.display).toHaveText(kept);
    });
  }

  for (const [labels, kept] of [
    ['2 + =', '2 +'],
    ['( =', '('],
    ['√ =', '√'],
  ]) {
    test(`AC-026 ${labels} is incomplete and sends nothing`, async ({ calculator }) => {
      await calculator.press(labels);

      await expect(calculator.message).toHaveText('Incomplete expression');
      await expect(calculator.display).toHaveText(kept);
      expect(calculator.calls).toEqual([]);
    });
  }

  test('AC-037 an unreachable service shows a message', async ({ calculator, page }) => {
    await page.route('**/api/v1/**', (route) => route.abort('connectionrefused'));

    await calculator.press('2 + 3 =');

    await expect(calculator.message).toHaveText("Can't reach the calculator service");
    await expect(calculator.display).toHaveText('2 + 3');
  });

  const unexpected: [string, { status: number; contentType: string; body: string }][] = [
    ['a 500 from the service', { status: 500, contentType: 'application/json', body: '{"error":{"code":"INTERNAL_ERROR","message":"an unexpected error occurred"}}' }],
    ['an error code the application does not know', { status: 422, contentType: 'application/json', body: '{"error":{"code":"SOMETHING_NEW","message":"new"}}' }],
    ['an error page that is not JSON', { status: 502, contentType: 'text/html', body: '<html>Bad Gateway</html>' }],
    ['a success without a result', { status: 200, contentType: 'application/json', body: '{"operation":"add"}' }],
  ];

  for (const [name, response] of unexpected) {
    test(`AC-038 ${name} shows a general message`, async ({ calculator, page }) => {
      await page.route('**/api/v1/**', (route) => route.fulfill(response));

      await calculator.press('2 + 3 =');

      await expect(calculator.message).toHaveText('Something went wrong');
      await expect(calculator.display).toHaveText('2 + 3');
    });
  }

  test('AC-039 the next input removes the message and the expression can be fixed', async ({ calculator }) => {
    await calculator.press('1 0 ÷ 0 =');
    await expect(calculator.message).toHaveText("Can't divide by zero");

    await calculator.press('⌫');
    await expect(calculator.message).toBeHidden();
    await expect(calculator.display).toHaveText('10 ÷');

    await calculator.press('5 =');
    await expect(calculator.display).toHaveText('2');
  });

  test('AC-039 the calculator works again once the service is back', async ({ calculator, page }) => {
    await page.route('**/api/v1/**', (route) => route.abort('connectionrefused'));
    await calculator.press('2 + 3 =');
    await expect(calculator.message).toHaveText("Can't reach the calculator service");

    await page.unroute('**/api/v1/**');
    await calculator.press('=');

    await expect(calculator.display).toHaveText('5');
    await expect(calculator.message).toBeHidden();
  });

  test('AC-040 evaluation stops at the first failure', async ({ calculator }) => {
    await calculator.press('1 ÷ 0 + 2 × 3 =');

    await expect(calculator.message).toHaveText("Can't divide by zero");
    expect(calculator.calls).toEqual([{ operation: 'divide', body: { numbers: [1, 0] } }]);
  });
});

test.describe('E2E-05 waiting', () => {
  test('AC-041 input is disabled until the service answers', async ({ calculator, page }) => {
    // Hold the response until the test lets it through.
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/api/v1/add', async (route) => {
      await held;
      await route.continue();
    });

    for (const label of ['2', '+', '3', '=']) {
      await calculator.button(label).click();
    }

    await expect(calculator.calculator).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('progressbar', { name: 'Calculating' })).toBeVisible();
    for (const button of await calculator.keypad.getByRole('button').all()) {
      await expect(button).toBeDisabled();
    }

    await page.keyboard.type('7');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowLeft');
    expect(await calculator.displayWithCursor()).toBe('2 + 3‸');

    release();

    await expect(calculator.display).toHaveText('5');
    await expect(calculator.calculator).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('progressbar')).toBeHidden();
    for (const button of await calculator.keypad.getByRole('button').all()) {
      await expect(button).toBeEnabled();
    }
  });
});
