import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Calculator } from './components/Calculator';
import { theme } from './theme';

/** The page: a heading and the calculator, centered. */
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        component="main"
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          p: { xs: 1, sm: 2 },
          // Short screens: less space around the calculator, more for it.
          '@media (max-height: 620px)': { gap: 1, p: 1 },
        }}
      >
        <Typography component="h1" variant="h5">
          Calculator
        </Typography>
        <Calculator />
      </Box>
    </ThemeProvider>
  );
}
