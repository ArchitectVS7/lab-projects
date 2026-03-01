import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cd backend && npm run dev',
      port: 4000,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        DATABASE_URL: 'postgresql://taskapp:taskapp_secret@localhost:5432/taskapp_test',
        JWT_SECRET: 'test-jwt-secret',
        NODE_ENV: 'test',
      },
    },
    {
      command: 'cd frontend && npm run dev',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
