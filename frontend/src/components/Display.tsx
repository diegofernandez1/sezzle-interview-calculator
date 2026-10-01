import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useLayoutEffect, useRef } from 'react';

interface DisplayProps {
  /** The expression being entered, or the result. */
  expression: string;
  /** The last evaluated expression, shown above its result. */
  previous: string | null;
  /** The message of the last failure. */
  error: string | null;
  /** An evaluation is in progress. */
  pending: boolean;
}

type TextSize = 'large' | 'medium' | 'small';

const FONT_SIZES: Record<TextSize, string> = { large: '2.125rem', medium: '1.6rem', small: '1.25rem' };

/** Longer expressions are set smaller, so more of them fits on the line. */
function textSize(expression: string): TextSize {
  if (expression.length <= 10) return 'large';
  if (expression.length <= 16) return 'medium';
  return 'small';
}

/** The calculator's screen: previous expression, current value, and message. */
export function Display({ expression, previous, error, pending }: DisplayProps) {
  const size = textSize(expression);

  // An expression too long for the line scrolls sideways. Keep the end in
  // view, because that is where the next input goes.
  const line = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (line.current) line.current.scrollLeft = line.current.scrollWidth;
  }, [expression]);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 0,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        px: 2,
        pt: 1.5,
        pb: 1,
        '@media (max-height: 620px)': { pt: 0.5, pb: 0.5 },
      }}
    >
      {pending && (
        <LinearProgress aria-label="Calculating" sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />
      )}

      {/* Each line keeps its height when empty, so the layout does not jump. */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: 'flex', justifyContent: 'flex-end', overflow: 'hidden', whiteSpace: 'nowrap', minHeight: '1.5em' }}
      >
        {previous}
      </Typography>

      <Typography
        ref={line}
        role="status"
        aria-live="polite"
        data-size={size}
        sx={{
          fontSize: FONT_SIZES[size],
          // A fixed line height keeps the display the same height at every text size.
          lineHeight: '2.75rem',
          height: '2.75rem',
          textAlign: 'right',
          whiteSpace: 'nowrap',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {expression}
      </Typography>

      <Box sx={{ minHeight: '1.5em', textAlign: 'right' }}>
        {error && (
          <Typography role="alert" variant="body2" color="error" sx={{ overflowWrap: 'anywhere' }}>
            {error}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
