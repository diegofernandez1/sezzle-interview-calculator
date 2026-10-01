import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { calculatorApi } from '../api/calculatorApi';
import type { CalculatorApi } from '../calculator/types';
import { useCalculator } from '../hooks/useCalculator';
import { useKeyboard } from '../hooks/useKeyboard';
import { Display } from './Display';
import { Keypad } from './Keypad';

interface CalculatorProps {
  /** The service that does the arithmetic. Tests pass a fake. */
  api?: CalculatorApi;
}

/** A screen that is short and wide, such as a phone held sideways. */
const SHORT_AND_WIDE = '@media (max-height: 480px) and (min-width: 560px)';
/** A screen too short to fit the keyboard hint under the keypad. */
const SHORT = '@media (max-height: 620px)';

/** The calculator: a display and a keypad, usable with mouse, touch, or keyboard. */
export function Calculator({ api = calculatorApi }: CalculatorProps) {
  const { units, cursor, previous, error, pending, press } = useCalculator(api);
  useKeyboard(press);

  return (
    <Paper
      component="section"
      aria-label="Calculator"
      aria-busy={pending}
      elevation={3}
      sx={{
        width: '100%',
        maxWidth: 400,
        p: { xs: 1.5, sm: 2 },
        borderRadius: 5,
        // In dark mode MUI lightens raised surfaces with a gradient; turning
        // it off keeps the card darker than the buttons.
        backgroundImage: 'none',
        [SHORT_AND_WIDE]: { maxWidth: 760 },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1.5, sm: 2 },
          // Display above the keypad; beside it when the screen is short and wide.
          gridTemplateColumns: 'minmax(0, 1fr)',
          [SHORT_AND_WIDE]: { gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)' },
        }}
      >
        <Display
          units={units}
          cursor={cursor}
          previous={previous}
          error={error}
          pending={pending}
          onPlaceCursor={(position) => press({ type: 'placeCursor', position })}
        />
        <Keypad onPress={press} disabled={pending} />
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ mt: 2, mb: 0, [SHORT]: { display: 'none' } }}
      >
        You can type: Enter for =, Backspace for ⌫, Esc for AC, r for √, ^ for xʸ, and % for % of.
        The arrow keys, or a click in the display, move the cursor.
        “25 % of 200” gives 12.5, because 25 is 12.5% of 200.
      </Typography>
    </Paper>
  );
}
