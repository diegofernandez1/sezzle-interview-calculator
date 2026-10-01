import { createTheme } from '@mui/material/styles';

/**
 * Light and dark color schemes in the style of the Google calculator. The
 * scheme follows the system setting.
 *
 * With CSS variables the browser picks the scheme through a
 * prefers-color-scheme media query. Without them MUI picks it in JavaScript
 * after the first render, and dark-mode users see a flash of the light theme.
 */
export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1a73e8' },
        background: { default: '#f8f9fa', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#8ab4f8' },
        background: { default: '#17181a', paper: '#202124' },
      },
    },
  },
  typography: {
    fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
  },
});
