import { defineConfig, devices } from '@playwright/test';

/**
 * Real-browser checks against real Stripe.js in Stripe TEST mode.
 *
 * Needs network access to js.stripe.com and to the demo API (DEMO_API_BASE in support/demo-api.ts),
 * so it is not part of CI. Run it locally with `pnpm run test:e2e:stripe` after `pnpm run build`.
 *
 * The demo API only answers allowlisted origins, and `http://localhost:4321` is one of them,
 * so the harness is served on that port by default.
 */
const port = Number(process.env.STRIPE_E2E_PORT ?? 4321);
const baseURL = `http://localhost:${port}`;

// Use a pre-installed Chromium when the bundled one is unavailable (e.g. a version mismatch)
const executablePath = process.env.STRIPE_E2E_CHROMIUM_PATH;

export default defineConfig({
  testDir: '.',
  // `*.pw.ts` keeps these files out of the Jest regexes used by `stencil test`
  testMatch: '**/*.pw.ts',
  // Real network round trips to Stripe; keep it generous but bounded
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '../../test-reports/stripe-e2e',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    command: `node ./server.mjs`,
    cwd: __dirname,
    url: `${baseURL}/e2e/health`,
    env: { STRIPE_E2E_PORT: String(port) },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
