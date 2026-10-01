import { defineConfig, devices } from '@playwright/test';

// The suite starts its own calculate service and frontend, on ports chosen
// not to clash with ones started by hand. To test an application that is
// already running, such as the Docker containers, give its address instead:
//
//   E2E_BASE_URL=http://localhost:3000 npm run e2e

const SERVICE_PORT = 18080;
const FRONTEND_PORT = 15173;
const externalUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A test left with `.only` must not silently skip the rest in CI.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: externalUrl ?? `http://localhost:${FRONTEND_PORT}`,
    // Kept only for tests that fail: enough to see what happened.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /@touch/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grepInvert: /@touch/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grepInvert: /@touch/ },
    // A phone-sized screen with touch input. It runs the tests tagged @touch.
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@touch/ },
  ],

  webServer: externalUrl
    ? undefined
    : [
        {
          name: 'calculate-service',
          command: 'go run ./cmd/server',
          cwd: '../backend/calculate-service',
          env: { PORT: String(SERVICE_PORT) },
          url: `http://localhost:${SERVICE_PORT}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          name: 'frontend',
          command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
          env: { CALC_SERVICE_URL: `http://localhost:${SERVICE_PORT}` },
          url: `http://localhost:${FRONTEND_PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
