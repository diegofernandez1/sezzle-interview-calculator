import Button from '@mui/material/Button';
import type { KeyDef } from '../calculator/keys';
import type { Action } from '../calculator/types';

interface CalcButtonProps {
  keyDef: KeyDef;
  onPress: (action: Action) => void;
  disabled?: boolean;
}

/** Background and text colors per kind of button, for light and dark. */
const COLORS: Record<KeyDef['kind'], Record<'light' | 'dark', { bg: string; hover: string; text: string }>> = {
  digit: {
    light: { bg: '#f1f3f4', hover: '#e4e6e9', text: '#202124' },
    dark: { bg: '#3c4043', hover: '#494d51', text: '#e8eaed' },
  },
  operator: {
    light: { bg: '#dadce0', hover: '#cdd0d5', text: '#202124' },
    dark: { bg: '#5f6368', hover: '#6c7176', text: '#e8eaed' },
  },
  equals: {
    light: { bg: '#1a73e8', hover: '#1765cc', text: '#ffffff' },
    dark: { bg: '#8ab4f8', hover: '#a3c3fa', text: '#202124' },
  },
};

/** One keypad button. */
export function CalcButton({ keyDef, onPress, disabled = false }: CalcButtonProps) {
  const { light, dark } = COLORS[keyDef.kind];

  return (
    <Button
      variant="contained"
      disableElevation
      disabled={disabled}
      aria-label={keyDef.name}
      aria-keyshortcuts={keyDef.shortcut}
      onClick={() => onPress(keyDef.action)}
      // A mouse click must not leave focus on the button: Enter would then
      // press it again instead of evaluating. Tab focus is unaffected.
      onMouseDown={(event) => event.preventDefault()}
      style={{
        gridColumn: keyDef.columns ? `span ${keyDef.columns}` : undefined,
        gridRow: keyDef.rows ? `span ${keyDef.rows}` : undefined,
      }}
      sx={(theme) => ({
        minWidth: 0,
        minHeight: 52,
        // Shorter buttons on short screens keep the whole keypad in view.
        '@media (max-height: 620px)': { minHeight: 44 },
        '@media (max-height: 420px)': { minHeight: 36, paddingTop: 0, paddingBottom: 0 },
        px: 0.5,
        borderRadius: 999,
        // Labels longer than one character, such as "% of", are set smaller.
        fontSize: keyDef.label.length > 2 ? '0.9rem' : '1.25rem',
        fontWeight: 500,
        textTransform: 'none',
        bgcolor: light.bg,
        color: light.text,
        '&:hover': { bgcolor: light.hover },
        '&.Mui-focusVisible': {
          outline: `3px solid ${(theme.vars ?? theme).palette.primary.main}`,
          outlineOffset: 2,
        },
        ...theme.applyStyles('dark', {
          backgroundColor: dark.bg,
          color: dark.text,
          '&:hover': { backgroundColor: dark.hover },
        }),
      })}
    >
      {keyDef.label}
    </Button>
  );
}
