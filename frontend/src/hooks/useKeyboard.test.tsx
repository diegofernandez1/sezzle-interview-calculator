import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Action } from '../calculator/types';
import { useKeyboard } from './useKeyboard';

function setup() {
  const onAction = vi.fn<(action: Action) => void>();
  const hook = renderHook(() => useKeyboard(onAction));
  return { onAction, user: userEvent.setup(), ...hook };
}

describe('useKeyboard', () => {
  it('AC-042 reports digits and the decimal point without anything focused', async () => {
    const { onAction, user } = setup();

    await user.keyboard('12.5');

    expect(onAction.mock.calls.map(([action]) => action)).toEqual([
      { type: 'digit', digit: '1' },
      { type: 'digit', digit: '2' },
      { type: 'decimal' },
      { type: 'digit', digit: '5' },
    ]);
  });

  it('AC-043 reports operator keys', async () => {
    const { onAction, user } = setup();

    await user.keyboard('+-*/^%r()');

    expect(onAction.mock.calls.map(([action]) => action)).toEqual([
      { type: 'operator', op: 'add' },
      { type: 'operator', op: 'subtract' },
      { type: 'operator', op: 'multiply' },
      { type: 'operator', op: 'divide' },
      { type: 'operator', op: 'exponent' },
      { type: 'operator', op: 'percentage' },
      { type: 'sqrt' },
      { type: 'lparen' },
      { type: 'rparen' },
    ]);
  });

  it('AC-045 reports Enter and = as equals', async () => {
    const { onAction, user } = setup();

    await user.keyboard('{Enter}=');

    expect(onAction.mock.calls).toEqual([[{ type: 'equals' }], [{ type: 'equals' }]]);
  });

  it('AC-046 reports Backspace, Escape, and Delete', async () => {
    const { onAction, user } = setup();

    await user.keyboard('{Backspace}{Escape}{Delete}');

    expect(onAction.mock.calls).toEqual([[{ type: 'backspace' }], [{ type: 'clear' }], [{ type: 'clear' }]]);
  });

  it('AC-065 reports the arrow, Home, and End keys as cursor moves', async () => {
    const { onAction, user } = setup();

    await user.keyboard('{ArrowLeft}{ArrowRight}{Home}{End}');

    expect(onAction.mock.calls.map(([action]) => action)).toEqual([
      { type: 'moveCursor', to: 'left' },
      { type: 'moveCursor', to: 'right' },
      { type: 'moveCursor', to: 'start' },
      { type: 'moveCursor', to: 'end' },
    ]);
  });

  it('AC-047 leaves keys pressed with Ctrl, Meta, or Alt to the browser', async () => {
    const { onAction, user } = setup();

    await user.keyboard('{Control>}1{/Control}{Meta>}r{/Meta}{Alt>}5{/Alt}');

    expect(onAction).not.toHaveBeenCalled();
  });

  it('FR-025 ignores keys that have no button', async () => {
    const { onAction, user } = setup();

    await user.keyboard('a{Tab}{ArrowUp} ');

    expect(onAction).not.toHaveBeenCalled();
  });

  it('FR-025 prevents the browser default for keys it handles, and only those', () => {
    setup();

    const handled = new KeyboardEvent('keydown', { key: '/', cancelable: true });
    window.dispatchEvent(handled);
    const unhandled = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    window.dispatchEvent(unhandled);

    expect(handled.defaultPrevented).toBe(true);
    expect(unhandled.defaultPrevented).toBe(false);
  });

  it('AC-050 leaves Enter to a focused button', async () => {
    const { onAction, user } = setup();
    const onClick = vi.fn();
    render(<button onClick={onClick}>Focusable</button>);

    screen.getByRole('button', { name: 'Focusable' }).focus();
    await user.keyboard('{Enter}');

    expect(onAction).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('AC-050 still reports other keys while a button is focused', async () => {
    const { onAction, user } = setup();
    render(<button>Focusable</button>);

    screen.getByRole('button', { name: 'Focusable' }).focus();
    await user.keyboard('7');

    expect(onAction).toHaveBeenCalledWith({ type: 'digit', digit: '7' });
  });

  it('FR-025 calls the latest handler after a re-render', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const user = userEvent.setup();
    const { rerender } = renderHook(({ handler }) => useKeyboard(handler), {
      initialProps: { handler: first },
    });

    rerender({ handler: second });
    await user.keyboard('1');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('FR-025 stops listening when unmounted', async () => {
    const { onAction, user, unmount } = setup();

    unmount();
    await user.keyboard('1');

    expect(onAction).not.toHaveBeenCalled();
  });
});
