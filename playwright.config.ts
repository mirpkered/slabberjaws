import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/responsive',
  use: { baseURL: process.env.RESPONSIVE_BASE_URL || 'http://localhost:5173', headless: true },
  workers: 1,
  projects: [{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
  webServer: process.env.RESPONSIVE_BASE_URL ? undefined : {
    command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true,
  },
});
