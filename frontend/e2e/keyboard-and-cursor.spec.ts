import { expect, test } from './calculatorPage';

// E2E-06, E2E-07, and E2E-10 of specs/004-end-to-end-tests/spec.md.

test.describe('E2E-06 keyboard', () => {
  test('AC-042 digits and the decimal point', async ({ calculator }) => {
    await calculator.type('12.5');

    await expect(calculator.display).toHaveText('12.5');
  });

  test('AC-043 operators', async ({ calculator }) => {
    await calculator.type('2+3-1*4/2^2');

    await expect(calculator.display).toHaveText('2 + 3 − 1 × 4 ÷ 2 ^ 2');
  });

  for (const [keys, shown] of [
    ['2x3', '2 × 3'],
    ['r9', '√9'],
    ['25%200', '25 % of 200'],
    ['(2+3)', '(2 + 3)'],
    ['1,5', '1.5'],
  ]) {
    test(`AC-044 typing ${keys} shows ${shown}`, async ({ calculator }) => {
      await calculator.type(keys);

      await expect(calculator.display).toHaveText(shown);
    });
  }

  for (const key of ['Enter', '=']) {
    test(`AC-045 ${key} evaluates a chained expression`, async ({ calculator }) => {
      await calculator.type('2+3*4');
      await calculator.key(key);

      await expect(calculator.display).toHaveText('14');
      expect(calculator.calls.map((call) => call.operation)).toEqual(['multiply', 'add']);
    });
  }

  for (const [key, shown] of [
    ['Backspace', '1'],
    ['Escape', '0'],
    ['Delete', '0'],
  ]) {
    test(`AC-046 typing 12 then ${key} shows ${shown}`, async ({ calculator }) => {
      await calculator.type('12');
      await calculator.key(key);

      await expect(calculator.display).toHaveText(shown);
    });
  }

  test('AC-047 keys pressed with Ctrl, Meta, or Alt are left to the browser', async ({ calculator }) => {
    await calculator.key('Control+1');
    await calculator.key('Meta+2');
    await calculator.key('Alt+5');

    await expect(calculator.display).toHaveText('0');
  });

  test('AC-016 keys and buttons can be mixed in one expression', async ({ calculator }) => {
    await calculator.type('2+');
    await calculator.press('3 ×');
    await calculator.type('4');
    await calculator.key('Enter');

    await expect(calculator.display).toHaveText('14');
  });

  test('AC-039 a whole calculation, a mistake, and a correction, from the keyboard', async ({ calculator }) => {
    await calculator.type('10/0');
    await calculator.key('Enter');
    await expect(calculator.message).toHaveText("Can't divide by zero");

    await calculator.key('Backspace');
    await calculator.type('4');
    await calculator.key('Enter');

    await expect(calculator.display).toHaveText('2.5');
    await expect(calculator.message).toBeHidden();
  });
});

test.describe('E2E-07 cursor', () => {
  test('AC-059 the cursor starts at the end', async ({ calculator }) => {
    await calculator.expectCursor('0‸');

    await calculator.press('1 2 + 3');

    await calculator.expectCursor('12 + 3‸');
    await expect(calculator.display.getByTestId('caret')).toBeVisible();
  });

  const edits: [string, string, string][] = [
    ['AC-060', '1 2 + 3 ◀ ◀', '12‸ + 3'],
    ['AC-060', '1 2 + 3 ◀ ◀ 5', '125‸ + 3'],
    ['AC-061', '1 2 3 ◀ +', '12 + ‸3'],
    ['AC-062', '1 2 3 ◀ ⌫', '1‸3'],
    ['AC-062', '1 2 + 3 ◀ ⌫', '12‸3'],
    ['AC-063', '1 . 2 + 3 . 4 ◀ ◀ ◀ ⌫', '1.2‸34'],
    ['AC-064', '1 2 ◀ ◀ ◀', '‸12'],
    ['AC-064', '1 2 ▶', '12‸'],
    ['AC-067', '2 + 3 ◀ ◀ ×', '2 × ‸3'],
    ['AC-072', '2 + 3 = ◀ 7', '7‸'],
    ['AC-072', '2 + 3 = ◀ ×', '5 × ‸'],
  ];

  for (const [id, labels, shown] of edits) {
    test(`${id} pressing ${labels} shows ${shown}`, async ({ calculator }) => {
      await calculator.press(labels);

      await calculator.expectCursor(shown);
    });
  }

  test('AC-065 the arrow, Home, and End keys move the cursor', async ({ calculator }) => {
    await calculator.type('123');
    await calculator.key('ArrowLeft');
    await calculator.key('ArrowLeft');
    await calculator.expectCursor('1‸23');

    await calculator.key('ArrowRight');
    await calculator.expectCursor('12‸3');

    await calculator.key('Home');
    await calculator.expectCursor('‸123');

    await calculator.key('End');
    await calculator.expectCursor('123‸');
  });

  test('AC-066 a click in the display places the cursor on the side that was clicked', async ({ calculator }) => {
    await calculator.press('1 2 + 3');
    const plus = calculator.item('+');
    const box = (await plus.boundingBox())!;

    await plus.click({ position: { x: box.width * 0.2, y: box.height / 2 } });
    await calculator.expectCursor('12‸ + 3');

    await plus.click({ position: { x: box.width * 0.8, y: box.height / 2 } });
    await calculator.expectCursor('12 + ‸3');

    // The text is right-aligned, so the left edge of the line is empty.
    await calculator.display.click({ position: { x: 4, y: 10 } });
    await calculator.expectCursor('12 + 3‸');
  });

  test('AC-068 an operand typed before a group is multiplied with it', async ({ calculator }) => {
    await calculator.press('( 2 )');
    await calculator.key('Home');
    await calculator.type('5');

    await calculator.expectCursor('5‸ × (2)');
  });

  test('AC-069 a negative sign becomes a subtraction when its operator is removed', async ({ calculator }) => {
    await calculator.press('2 × − 3 ◀ ◀ ⌫');
    await calculator.expectCursor('2‸ − 3');

    await calculator.press('=');

    await expect(calculator.display).toHaveText('−1');
    expect(calculator.calls).toEqual([{ operation: 'subtract', body: { numbers: [2, 3] } }]);
  });

  test('AC-070 the edited expression is what the service receives', async ({ calculator }) => {
    await calculator.press('1 2 + 3 ◀ ◀ 5 =');

    await calculator.expectCursor('128‸');
    expect(calculator.calls).toEqual([{ operation: 'add', body: { numbers: [125, 3] } }]);
  });

  test('AC-071 an edit that breaks the expression is reported on equals', async ({ calculator }) => {
    await calculator.press('2 ( 3 ) ◀ ◀ ◀ ⌫');
    await calculator.expectCursor('2‸(3)');

    await calculator.press('=');

    await expect(calculator.message).toHaveText('Incomplete expression');
    expect(calculator.calls).toEqual([]);
  });

  test('AC-073 moving the cursor keeps the message', async ({ calculator }) => {
    await calculator.press('1 ÷ 0 = ◀');

    await expect(calculator.message).toHaveText("Can't divide by zero");
    await calculator.expectCursor('1 ÷ ‸0');
  });

  test('AC-070 a wrong operator is fixed in place with the keyboard and the mouse', async ({ calculator }) => {
    // 2 + 3 × 4 was meant to be 2 × 3 × 4.
    await calculator.type('2+3*4');
    const plus = calculator.item('+');
    const box = (await plus.boundingBox())!;
    await plus.click({ position: { x: box.width * 0.2, y: box.height / 2 } });
    await calculator.type('*');
    await calculator.expectCursor('2 × ‸3 × 4');

    await calculator.key('Enter');

    await expect(calculator.display).toHaveText('24');
    expect(calculator.calls).toEqual([{ operation: 'multiply', body: { numbers: [2, 3, 4] } }]);
  });
});

test.describe('E2E-10 touch', { tag: '@touch' }, () => {
  test('AC-013 tapping buttons calculates', async ({ calculator }) => {
    await calculator.tap('2 + 3 × 4 =');

    await expect(calculator.display).toHaveText('14');
    expect(calculator.calls.map((call) => call.operation)).toEqual(['multiply', 'add']);
  });

  test('AC-066 tapping the display places the cursor', async ({ calculator }) => {
    await calculator.tap('1 2 + 3');
    const plus = calculator.item('+');
    const box = (await plus.boundingBox())!;

    await plus.tap({ position: { x: box.width * 0.2, y: box.height / 2 } });
    await calculator.expectCursor('12‸ + 3');

    await calculator.tap('5 =');
    await expect(calculator.display).toHaveText('128');
  });

  test('AC-060 the cursor buttons work by touch', async ({ calculator }) => {
    await calculator.tap('1 2 + 3 ◀ ◀ ⌫');

    await calculator.expectCursor('1‸ + 3');
  });

  test('FR-034 the display and every button are in view on a phone', async ({ calculator, page }) => {
    const viewport = page.viewportSize()!;

    for (const element of [calculator.display, ...(await calculator.keypad.getByRole('button').all())]) {
      const box = (await element.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
  });
});
