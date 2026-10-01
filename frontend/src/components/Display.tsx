import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { Fragment, useLayoutEffect, useRef, type MouseEvent } from 'react';

interface DisplayProps {
  /**
   * The expression being entered, or the result, as the items the cursor
   * steps over. Empty shows 0.
   */
  units: string[];
  /** How many items are left of the cursor. */
  cursor: number;
  /** The last evaluated expression, shown above its result. */
  previous: string | null;
  /** The message of the last failure. */
  error: string | null;
  /** An evaluation is in progress. */
  pending: boolean;
  /** Called with the new cursor position when the expression is clicked. */
  onPlaceCursor?: (position: number) => void;
}

type TextSize = 'large' | 'medium' | 'small';

const FONT_SIZES: Record<TextSize, string> = { large: '2.125rem', medium: '1.6rem', small: '1.25rem' };

/** Longer expressions are set smaller, so more of them fits on the line. */
function textSize(length: number): TextSize {
  if (length <= 10) return 'large';
  if (length <= 16) return 'medium';
  return 'small';
}

/** The calculator's screen: previous expression, current value, and message. */
export function Display({ units, cursor, previous, error, pending, onPlaceCursor }: DisplayProps) {
  const text = units.join('');
  const size = textSize(text.trim().length);

  // An expression too long for the line scrolls sideways. Keep the cursor in
  // view, because that is where the next input goes.
  const caret = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    caret.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [text, cursor]);

  /** A click on an item puts the cursor on the side of it that was clicked. */
  function placeBeside(event: MouseEvent<HTMLSpanElement>, index: number) {
    event.stopPropagation();
    const box = event.currentTarget.getBoundingClientRect();
    const onLeftHalf = event.clientX < box.left + box.width / 2;
    onPlaceCursor?.(onLeftHalf ? index : index + 1);
  }

  const caretMark = (
    <Box
      component="span"
      ref={caret}
      aria-hidden
      data-testid="caret"
      sx={{
        display: 'inline-block',
        width: '2px',
        height: '1.15em',
        // Negative margins keep the bar from pushing the text apart.
        mx: '-1px',
        verticalAlign: 'text-bottom',
        bgcolor: 'primary.main',
        // Room on both sides when the line scrolls to the cursor.
        scrollMarginInline: '12px',
        animation: 'caret-blink 1.1s steps(1) infinite',
        '@keyframes caret-blink': { '50%': { opacity: 0 } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    />
  );

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
        role="status"
        aria-live="polite"
        data-size={size}
        // A click on the empty part of the line puts the cursor at the end.
        onClick={() => onPlaceCursor?.(units.length)}
        sx={{
          fontSize: FONT_SIZES[size],
          // A fixed line height keeps the display the same height at every text size.
          lineHeight: '2.75rem',
          height: '2.75rem',
          textAlign: 'right',
          // `pre` keeps the space of an operator at the end of the line.
          whiteSpace: 'pre',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          cursor: 'text',
        }}
      >
        {units.length === 0 && '0'}
        {units.map((unit, index) => (
          <Fragment key={index}>
            {index === cursor && caretMark}
            <span data-unit={index} onClick={(event) => placeBeside(event, index)}>
              {unit}
            </span>
          </Fragment>
        ))}
        {cursor >= units.length && caretMark}
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
