import Box from '@mui/material/Box';
import { KEYPAD } from '../calculator/keys';
import type { Action } from '../calculator/types';
import { CalcButton } from './CalcButton';

interface KeypadProps {
  onPress: (action: Action) => void;
  disabled?: boolean;
}

/** The grid of calculator buttons, five columns wide. */
export function Keypad({ onPress, disabled = false }: KeypadProps) {
  return (
    <Box
      role="group"
      aria-label="Calculator keypad"
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 1 }}
    >
      {KEYPAD.map((keyDef) => (
        <CalcButton key={keyDef.name} keyDef={keyDef} onPress={onPress} disabled={disabled} />
      ))}
    </Box>
  );
}
