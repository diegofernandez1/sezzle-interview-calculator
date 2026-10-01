import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Display } from './Display';

const idle = { units: [] as string[], cursor: 0, previous: null, error: null, pending: false };

/** A typed expression: one item per character, with the cursor at the end. */
const typed = (text: string) => ({ units: [...text], cursor: text.length });

/** The line's text with `‸` where the cursor is drawn. */
function lineWithCursor() {
  const line = screen.getByRole('status');
  const caret = within(line).getByTestId('caret');
  caret.textContent = '‸';
  const text = line.textContent;
  caret.textContent = '';
  return text;
}

afterEach(() => {
  // @ts-expect-error jsdom has no scrollIntoView; tests that add one remove it here.
  delete Element.prototype.scrollIntoView;
});

describe('Display', () => {
  it('AC-001 shows the expression', () => {
    render(<Display {...idle} units={['1', '2', ' + ', '3']} cursor={4} />);

    expect(screen.getByRole('status')).toHaveTextContent(/^12 \+ 3$/);
  });

  it('AC-012 shows 0 when nothing has been entered', () => {
    render(<Display {...idle} />);

    expect(screen.getByRole('status')).toHaveTextContent(/^0$/);
  });

  it('AC-027 shows the evaluated expression above the result', () => {
    render(<Display {...idle} {...typed('5')} previous="2 + 3 =" />);

    const previous = screen.getByText('2 + 3 =');
    const result = screen.getByRole('status');
    expect(result).toHaveTextContent(/^5$/);
    expect(previous.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('AC-049 announces the result politely', () => {
    render(<Display {...idle} {...typed('5')} previous="2 + 3 =" />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('AC-050 is not a Tab stop', () => {
    render(<Display {...idle} {...typed('12')} />);

    expect(screen.getByRole('status')).toHaveAttribute('tabindex', '-1');
  });

  it('AC-049 shows a message as an alert', () => {
    render(<Display {...idle} units={['1', ' ÷ ', '0']} cursor={3} error="Can't divide by zero" />);

    expect(screen.getByRole('alert')).toHaveTextContent("Can't divide by zero");
    expect(screen.getByRole('status')).toHaveTextContent('1 ÷ 0');
  });

  it('AC-049 has no alert when there is no message', () => {
    render(<Display {...idle} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['1234567890', 'large'],
    ['12345678901', 'medium'],
    ['1234567890 + 12', 'medium'],
    ['1234567890 + 123', 'medium'],
    ['1234567890 + 1234', 'small'],
    ['1234567890 + 123456', 'small'],
  ])('AC-055 sets %s in the %s size', (expression, size) => {
    render(<Display {...idle} {...typed(expression)} />);

    expect(screen.getByRole('status')).toHaveAttribute('data-size', size);
  });

  it('AC-055 does not count the space after a trailing operator', () => {
    render(<Display {...idle} units={[...'12345678', ' + ']} cursor={9} />);

    expect(screen.getByRole('status')).toHaveAttribute('data-size', 'large');
  });

  it('AC-055 keeps the display the same height at every size', () => {
    const { rerender } = render(<Display {...idle} {...typed('1')} />);
    const height = getComputedStyle(screen.getByRole('status')).height;

    rerender(<Display {...idle} {...typed('1234567890 + 123456')} />);

    expect(height).not.toBe('');
    expect(getComputedStyle(screen.getByRole('status')).height).toBe(height);
  });

  it('AC-056 scrolls the cursor into view when the text or the cursor changes', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const long = '1234567890 + 1234567890 + 1234567890';

    const { rerender } = render(<Display {...idle} {...typed(long)} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByTestId('caret'));
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', inline: 'nearest' });

    rerender(<Display {...idle} {...typed(long + '1')} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);

    rerender(<Display {...idle} units={[...long, '1']} cursor={3} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(3);

    // Nothing changed, so nothing scrolls.
    rerender(<Display {...idle} units={[...long, '1']} cursor={3} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it('AC-056 keeps the expression on one line that can scroll sideways', () => {
    render(<Display {...idle} {...typed('1234567890 + 1234567890 + 1234567890')} />);

    expect(screen.getByRole('status')).toHaveStyle({ whiteSpace: 'pre', overflowX: 'auto' });
  });

  it('AC-057 lets a long message wrap', () => {
    render(<Display {...idle} error="Can't take the square root of a negative number" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("Can't take the square root of a negative number");
    expect(alert).toHaveStyle({ overflowWrap: 'anywhere' });
    expect(getComputedStyle(alert).whiteSpace).not.toBe('nowrap');
  });

  it('AC-041 shows progress while pending, and only then', () => {
    const { rerender } = render(<Display {...idle} pending />);
    expect(screen.getByRole('progressbar', { name: 'Calculating' })).toBeInTheDocument();

    rerender(<Display {...idle} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it.each([
    [4, '12 + 3‸'],
    [3, '12 + ‸3'],
    [2, '12‸ + 3'],
    [1, '1‸2 + 3'],
    [0, '‸12 + 3'],
  ])('AC-059 draws the cursor at position %s', (cursor, shown) => {
    render(<Display {...idle} units={['1', '2', ' + ', '3']} cursor={cursor} />);

    expect(lineWithCursor()).toBe(shown);
  });

  it('AC-059 draws the cursor after the 0 of an empty expression', () => {
    render(<Display {...idle} />);

    expect(lineWithCursor()).toBe('0‸');
  });

  it('AC-059 hides the cursor mark from assistive technology and from the text', () => {
    render(<Display {...idle} {...typed('12')} />);

    expect(screen.getByTestId('caret')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('status').textContent).toBe('12');
  });

  describe('clicking', () => {
    function setup() {
      const onPlaceCursor = vi.fn();
      render(<Display {...idle} units={['1', '2', ' + ', '3']} cursor={4} onPlaceCursor={onPlaceCursor} />);
      const plus = screen.getByText('+', { selector: '[data-unit]' });
      // jsdom does no layout, so give the item a position and a width.
      plus.getBoundingClientRect = () => ({ left: 100, width: 20 }) as DOMRect;
      return { onPlaceCursor, plus, user: userEvent.setup() };
    }

    it('AC-066 puts the cursor before an item clicked on its left half', async () => {
      const { onPlaceCursor, plus, user } = setup();

      await user.pointer({ target: plus, coords: { clientX: 109 }, keys: '[MouseLeft]' });

      expect(onPlaceCursor).toHaveBeenCalledTimes(1);
      expect(onPlaceCursor).toHaveBeenCalledWith(2);
    });

    it('AC-066 puts the cursor after an item clicked on its right half', async () => {
      const { onPlaceCursor, plus, user } = setup();

      await user.pointer({ target: plus, coords: { clientX: 110 }, keys: '[MouseLeft]' });

      expect(onPlaceCursor).toHaveBeenCalledTimes(1);
      expect(onPlaceCursor).toHaveBeenCalledWith(3);
    });

    it('AC-066 puts the cursor at the end when the empty part of the line is clicked', async () => {
      const { onPlaceCursor, user } = setup();

      await user.click(screen.getByRole('status'));

      expect(onPlaceCursor).toHaveBeenCalledTimes(1);
      expect(onPlaceCursor).toHaveBeenCalledWith(4);
    });

    it('AC-066 does nothing when no handler is given', async () => {
      render(<Display {...idle} {...typed('12')} />);

      await userEvent.click(screen.getByText('1', { selector: '[data-unit]' }));
      await userEvent.click(screen.getByRole('status'));

      expect(lineWithCursor()).toBe('12‸');
    });
  });
});
