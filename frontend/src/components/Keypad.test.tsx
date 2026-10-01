import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KEYPAD } from '../calculator/keys';
import { Keypad } from './Keypad';

function setup(disabled = false) {
  const onPress = vi.fn();
  render(<Keypad onPress={onPress} disabled={disabled} />);
  return { onPress, user: userEvent.setup(), group: screen.getByRole('group', { name: 'Calculator keypad' }) };
}

describe('Keypad', () => {
  it('AC-048 puts every button in a group named Calculator keypad', () => {
    const { group } = setup();

    expect(within(group).getAllByRole('button')).toHaveLength(KEYPAD.length);
  });

  it.each([
    ...'0123456789'.split(''),
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
  ])('AC-048 has a button named %s', (name) => {
    const { group } = setup();

    expect(within(group).getByRole('button', { name })).toBeEnabled();
  });

  it('AC-048 shows the labels in the order of the layout', () => {
    const { group } = setup();

    const labels = within(group)
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(labels).toEqual([
      ...['(', ')', '% of', '⌫', 'AC'],
      ...['7', '8', '9', '÷', '√'],
      ...['4', '5', '6', '×', 'xʸ'],
      ...['1', '2', '3', '−', '+'],
      ...['0', '.', '◀', '▶', '='],
    ]);
  });

  it.each(KEYPAD)('AC-013 reports the action of $name when clicked', async (keyDef) => {
    const { onPress, user } = setup();

    await user.click(screen.getByRole('button', { name: keyDef.name }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(keyDef.action);
  });

  it('AC-041 disables every button when disabled', () => {
    const { group } = setup(true);

    for (const button of within(group).getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });
});
