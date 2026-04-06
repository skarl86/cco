import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3199',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    { name: 'chromium', use: { channel: 'chromium' } },
  ],
  webServer: {
    command: 'npx tsx server/src/index.ts',
    url: 'http://127.0.0.1:3199/api/health',
    reuseExistingServer: false,
    timeout: 15000,
    env: {
      CCO_PORT: '3199',
      CCO_DB_PATH: ':memory:',
    },
  },
});
