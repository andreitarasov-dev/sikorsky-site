import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'theme.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4333', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 12'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4333',
    cwd: process.env.THEME_FIXTURE_DIR ?? './fixtures/site',
    url: 'http://127.0.0.1:4333',
    reuseExistingServer: false,
  },
});
