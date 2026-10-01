import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

// In development the browser calls /api on the dev server, which forwards the
// request to the calculate service. No CORS setup is needed.
const serviceUrl = process.env.CALC_SERVICE_URL ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': serviceUrl },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // The end-to-end tests in e2e/ belong to Playwright: `npm run e2e`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}', 'src/**/*.d.ts'],
    },
  },
});
