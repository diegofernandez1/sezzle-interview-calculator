import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Display } from './Display';

const idle = { expression: '0', previous: null, error: null, pending: false };

describe('Display', () => {
  it('AC-001 shows the expression', () => {
    render(<Display {...idle} expression="12 + 3" />);

    expect(screen.getByRole('status')).toHaveTextContent(/^12 \+ 3$/);
  });

  it('AC-012 shows 0 when nothing has been entered', () => {
    render(<Display {...idle} />);

    expect(screen.getByRole('status')).toHaveTextContent(/^0$/);
  });

  it('AC-027 shows the evaluated expression above the result', () => {
    render(<Display {...idle} expression="5" previous="2 + 3 =" />);

    const previous = screen.getByText('2 + 3 =');
    const result = screen.getByRole('status');
    expect(result).toHaveTextContent(/^5$/);
    expect(previous.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('AC-049 announces the result politely', () => {
    render(<Display {...idle} expression="5" previous="2 + 3 =" />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('AC-049 shows a message as an alert', () => {
    render(<Display {...idle} expression="1 ÷ 0" error="Can't divide by zero" />);

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
    render(<Display {...idle} expression={expression} />);

    expect(screen.getByRole('status')).toHaveAttribute('data-size', size);
  });

  it('AC-055 keeps the display the same height at every size', () => {
    const { rerender } = render(<Display {...idle} expression="1" />);
    const height = getComputedStyle(screen.getByRole('status')).height;

    rerender(<Display {...idle} expression="1234567890 + 123456" />);

    expect(height).not.toBe('');
    expect(getComputedStyle(screen.getByRole('status')).height).toBe(height);
  });

  it('AC-056 scrolls a long expression to its end after each change', () => {
    const { rerender } = render(<Display {...idle} expression="1" />);
    const line = screen.getByRole('status');
    // jsdom does no layout, so give the line a width to scroll.
    Object.defineProperty(line, 'scrollWidth', { configurable: true, value: 900 });

    rerender(<Display {...idle} expression="1234567890 + 1234567890 + 1234567890" />);
    expect(line.scrollLeft).toBe(900);

    line.scrollLeft = 0;
    rerender(<Display {...idle} expression="1234567890 + 1234567890 + 12345678901" />);
    expect(line.scrollLeft).toBe(900);
  });

  it('AC-056 keeps the expression on one line that can scroll sideways', () => {
    render(<Display {...idle} expression="1234567890 + 1234567890 + 1234567890" />);

    expect(screen.getByRole('status')).toHaveStyle({ whiteSpace: 'nowrap', overflowX: 'auto' });
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
});
