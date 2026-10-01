import { expect, test as base, type Locator, type Page, type Request } from '@playwright/test';

/** Button labels as written in the spec, and the accessible names to find them by. */
const NAMES: Record<string, string> = {
  '+': 'add',
  '−': 'subtract',
  '×': 'multiply',
  '÷': 'divide',
  'xʸ': 'power',
  '√': 'square root',
  '%': 'as a percentage of',
  '(': 'open parenthesis',
  ')': 'close parenthesis',
  '.': 'decimal point',
  '=': 'equals',
  '⌫': 'backspace',
  AC: 'clear',
  '◀': 'move cursor left',
  '▶': 'move cursor right',
};

/** One request the page sent to the calculate service. */
export interface ServiceCall {
  /** The last path segment: add, subtract, square_root, and so on. */
  operation: string;
  body: unknown;
}

/** The calculator as a person sees and uses it. */
export class CalculatorPage {
  readonly page: Page;
  /** The whole calculator; `aria-busy` is true while it waits for the service. */
  readonly calculator: Locator;
  readonly keypad: Locator;
  /** The line showing the expression or the result. */
  readonly display: Locator;
  /** The error message, when there is one. */
  readonly message: Locator;
  /** Every request sent to the calculate service, in order. */
  readonly calls: ServiceCall[] = [];

  constructor(page: Page) {
    this.page = page;
    this.calculator = page.getByRole('region', { name: 'Calculator' });
    this.keypad = page.getByRole('group', { name: 'Calculator keypad' });
    this.display = page.getByRole('status');
    this.message = page.getByRole('alert');

    page.on('request', (request: Request) => {
      const match = /\/api\/v1\/([a-z_]+)$/.exec(new URL(request.url()).pathname);
      if (match && request.method() === 'POST') {
        this.calls.push({ operation: match[1], body: request.postDataJSON() });
      }
    });
  }

  async open() {
    await this.page.goto('/');
    await expect(this.display).toHaveText('0');
  }

  /** The keypad button with this label, such as `7`, `×`, or `=`. */
  button(label: string): Locator {
    return this.keypad.getByRole('button', { name: NAMES[label] ?? label, exact: true });
  }

  /**
   * Clicks buttons by label, separated by spaces: `2 + 3 × 4 =`. After each
   * click it waits until the calculator is no longer busy, so an evaluation
   * has finished before the next button.
   */
  async press(labels: string) {
    for (const label of labels.split(' ')) {
      await this.button(label).click();
      await this.idle();
    }
  }

  /** The same as `press`, with touch taps. */
  async tap(labels: string) {
    for (const label of labels.split(' ')) {
      await this.button(label).tap();
      await this.idle();
    }
  }

  /** Types characters on the keyboard, with nothing focused. */
  async type(keys: string) {
    await this.page.keyboard.type(keys);
    await this.idle();
  }

  /** Presses one named key or combination, such as `Enter` or `Control+1`. */
  async key(name: string) {
    await this.page.keyboard.press(name);
    await this.idle();
  }

  async idle() {
    await expect(this.calculator).toHaveAttribute('aria-busy', 'false');
  }

  /** The display text with `‸` where the cursor is drawn, as in the spec. */
  async displayWithCursor(): Promise<string> {
    return this.display.evaluate((line) =>
      [...line.childNodes]
        .map((node) => (node instanceof HTMLElement && node.dataset.testid === 'caret' ? '‸' : node.textContent))
        .join(''),
    );
  }

  /** Asserts the display and cursor, retrying until they match. */
  async expectCursor(shown: string) {
    await expect.poll(() => this.displayWithCursor()).toBe(shown);
  }

  /** One item of the expression in the display, by its text, such as `+`. */
  item(text: string): Locator {
    return this.display.getByText(text, { exact: true });
  }
}

/** `test` with a `calculator` fixture: the page, opened and ready. */
export const test = base.extend<{ calculator: CalculatorPage }>({
  calculator: async ({ page }, use) => {
    const calculator = new CalculatorPage(page);
    await calculator.open();
    await use(calculator);
  },
});

export { expect };
