import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    viewport: {
      width: 1440,
      height: 1080,
    },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm preview --host 0.0.0.0 --port 4321',
    url: 'http://127.0.0.1:4321/404.html',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
