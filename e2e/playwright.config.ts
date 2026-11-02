import { defineConfig, devices } from '@playwright/test';

// The production image as make e2e starts it: Playwright shares the network of the app container.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://localhost',
    // Caddy signs localhost with its own authority.
    ignoreHTTPSErrors: true,
    locale: 'uk-UA',
    timezoneId: 'Europe/Kyiv',
    trace: 'retain-on-failure',
  },
  // §18: phones with Chrome and Safari (WebKit) and a desktop.
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 15'] } },
    { name: 'Desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
