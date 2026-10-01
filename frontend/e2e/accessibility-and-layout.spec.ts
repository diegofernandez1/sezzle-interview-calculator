import AxeBuilder from '@axe-core/playwright';
import { expect, test, type CalculatorPage } from './calculatorPage';

// E2E-08 and E2E-09 of specs/004-end-to-end-tests/spec.md.

test.describe('E2E-08 accessibility', () => {
  test('AC-054 the page has a heading, a main area, and the calculator', async ({ calculator, page }) => {
    await expect(page).toHaveTitle('Calculator');
    await expect(page.getByRole('heading', { level: 1, name: 'Calculator' })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(calculator.calculator).toBeVisible();
  });

  test('AC-048 every button is in the keypad group and has a name', async ({ calculator }) => {
    const names = [
      ...'0123456789',
      'decimal point',
      'add',
      'subtract',
      'multiply',
      'divide',
      'power',
      'square root',
      'as a percentage of',
      'open parenthesis',
      'close parenthesis',
      'equals',
      'backspace',
      'clear',
      'move cursor left',
      'move cursor right',
    ];

    for (const name of names) {
      await expect(calculator.keypad.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(calculator.keypad.getByRole('button')).toHaveCount(names.length);
  });

  test('AC-049 a result is a status and a message is an alert', async ({ calculator, page }) => {
    await calculator.press('2 + 3 =');
    await expect(page.getByRole('status')).toHaveText('5');
    await expect(page.getByRole('alert')).toBeHidden();

    await calculator.press('AC 1 ÷ 0 =');
    await expect(page.getByRole('alert')).toHaveText("Can't divide by zero");
  });

  test('AC-050 Enter on a focused button presses that button once and does not evaluate', async ({ calculator }) => {
    await calculator.press('2 +');
    await calculator.button('7').focus();
    await calculator.key('Enter');

    await expect(calculator.display).toHaveText('2 + 7');
    expect(calculator.calls).toEqual([]);
  });

  test('AC-050 Space on a focused button presses that button', async ({ calculator }) => {
    await calculator.button('7').focus();
    await calculator.key('Space');

    await expect(calculator.display).toHaveText('7');
  });

  test('AC-050 buttons are reached with Tab, in reading order', async ({ calculator, page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari moves between buttons with Option+Tab, a macOS setting, not Tab');

    await page.keyboard.press('Tab');
    await expect(calculator.button('(')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(calculator.button(')')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(calculator.display).toHaveText('0');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await expect(calculator.display).toHaveText('(');
  });

  test('AC-051 a mouse click leaves focus off the button, so Enter evaluates', async ({ calculator }) => {
    await calculator.press('2 + 3');
    await expect(calculator.button('3')).not.toBeFocused();

    await calculator.key('Enter');

    await expect(calculator.display).toHaveText('5');
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`in the ${colorScheme} scheme`, () => {
      test.use({ colorScheme });

      /** Runs the axe checks for WCAG 2.1 levels A and AA and expects no violation. */
      async function expectNoViolations(calculator: CalculatorPage) {
        const { violations } = await new AxeBuilder({ page: calculator.page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
      }

      test('FR-027 the empty calculator has no accessibility violations', async ({ calculator }) => {
        await expectNoViolations(calculator);
      });

      test('FR-027 a result has no accessibility violations', async ({ calculator }) => {
        await calculator.press('2 + 3 × 4 =');
        await expect(calculator.display).toHaveText('14');

        await expectNoViolations(calculator);
      });

      test('FR-028 a message has no accessibility violations', async ({ calculator }) => {
        await calculator.press('√ − 4 =');
        await expect(calculator.message).toBeVisible();

        await expectNoViolations(calculator);
      });
    });
  }
});

test.describe('E2E-09 responsive layout', () => {
  const screens = [
    { width: 320, height: 568, layout: 'stacked' },
    { width: 375, height: 667, layout: 'stacked' },
    { width: 667, height: 375, layout: 'side by side' },
    { width: 568, height: 320, layout: 'side by side' },
    { width: 1280, height: 800, layout: 'stacked' },
  ] as const;

  for (const { width, height, layout } of screens) {
    test.describe(`at ${width} × ${height}`, () => {
      test.use({ viewport: { width, height } });

      test(`FR-034 the display and every button are in view, and the page does not scroll`, async ({
        calculator,
        page,
      }) => {
        for (const element of [calculator.display, ...(await calculator.keypad.getByRole('button').all())]) {
          await expect(element).toBeInViewport({ ratio: 1 });
        }

        const scrolls = await page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollHeight > window.innerHeight || root.scrollWidth > window.innerWidth;
        });
        expect(scrolls).toBe(false);
      });

      test(`FR-035 the display is ${layout === 'stacked' ? 'above' : 'beside'} the keypad`, async ({ calculator }) => {
        const display = (await calculator.display.boundingBox())!;
        const keypad = (await calculator.keypad.boundingBox())!;

        if (layout === 'stacked') {
          expect(display.y + display.height).toBeLessThanOrEqual(keypad.y);
        } else {
          expect(display.x + display.width).toBeLessThanOrEqual(keypad.x);
        }
      });

      test('AC-056 a long expression keeps the cursor in view while typing and moving', async ({ calculator }) => {
        const caret = calculator.display.getByTestId('caret');
        const inLine = async () => {
          const line = (await calculator.display.boundingBox())!;
          const mark = (await caret.boundingBox())!;
          return mark.x >= line.x - 1 && mark.x + mark.width <= line.x + line.width + 1;
        };

        await calculator.type('1234567890+1234567890*1234567890');
        await expect(calculator.display).toHaveAttribute('data-size', 'small');
        await expect.poll(inLine).toBe(true);

        await calculator.key('Home');
        await expect.poll(inLine).toBe(true);
        await calculator.expectCursor('‸1234567890 + 1234567890 × 1234567890');

        await calculator.key('End');
        await expect.poll(inLine).toBe(true);
      });

      test('AC-057 a long message is shown in full', async ({ calculator }) => {
        await calculator.press('√ − 4 =');

        await expect(calculator.message).toHaveText("Can't take the square root of a negative number");
        await expect(calculator.message).toBeInViewport({ ratio: 1 });
        const cut = await calculator.message.evaluate((element) => element.scrollWidth > element.clientWidth);
        expect(cut).toBe(false);
        // The message must not push any button out of view.
        await expect(calculator.button('=')).toBeInViewport({ ratio: 1 });
      });
    });
  }

  for (const [expression, size] of [
    ['1234567890', 'large'],
    ['12345678901', 'medium'],
    ['1234567890+123456', 'small'],
  ]) {
    test(`AC-055 ${expression} is set in the ${size} size`, async ({ calculator }) => {
      await calculator.type(expression);

      await expect(calculator.display).toHaveAttribute('data-size', size);
    });
  }

  test('AC-055 the display keeps its height at every text size', async ({ calculator }) => {
    const height = async () => (await calculator.display.boundingBox())!.height;
    const large = await height();

    await calculator.type('1234567890+1234567890');

    expect(await height()).toBe(large);
  });
});
