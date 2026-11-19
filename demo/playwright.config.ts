import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  workers: 1,
  use: { baseURL: 'http://localhost:5292', channel: 'chrome' },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:5292/ui/', reuseExistingServer: true },
});
