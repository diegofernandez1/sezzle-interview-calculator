import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { KeyDef } from '../calculator/keys';
import { CalcButton } from './CalcButton';

const divide: KeyDef = {
  label: '÷',
  name: 'divide',
  kind: 'operator',
  action: { type: 'operator', op: 'divide' },
  shortcut: '/',
};

function setup(keyDef: KeyDef = divide, disabled = false) {
  const onPress = vi.fn();
  render(<CalcButton keyDef={keyDef} onPress={onPress} disabled={disabled} />);
  return { onPress, user: userEvent.setup(), button: screen.getByRole('button') };
}

describe('CalcButton', () => {
  it('AC-048 shows the label and is named for what it does', () => {
    const { button } = setup();

    expect(button).toHaveTextContent('÷');
    expect(button).toHaveAccessibleName('divide');
  });

  it('FR-025 advertises its keyboard key', () => {
    const { button } = setup();

    expect(button).toHaveAttribute('aria-keyshortcuts', '/');
  });

  it('AC-013 reports its action when clicked', async () => {
    const { button, onPress, user } = setup();

    await user.click(button);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith({ type: 'operator', op: 'divide' });
  });

  it('AC-050 is reachable with Tab and activated with Enter or Space', async () => {
    const { button, onPress, user } = setup();

    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('AC-051 does not take focus when clicked with the mouse', async () => {
    const { button, user } = setup();

    await user.click(button);

    expect(button).not.toHaveFocus();
  });

  it('AC-041 cannot be pressed when disabled', async () => {
    const { button, onPress } = setup(divide, true);
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    expect(button).toBeDisabled();
    await user.click(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it.each<[KeyDef['kind']]>([['digit'], ['operator'], ['equals']])('FR-031 renders the %s kind', (kind) => {
    const { button } = setup({ ...divide, kind });

    expect(button).toBeInTheDocument();
  });
});
