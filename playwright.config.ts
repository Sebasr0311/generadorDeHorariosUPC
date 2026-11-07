import { defineConfig, devices } from '@playwright/test';

const repository = process.env.GITHUB_REPOSITORY?.split('/');
const basePath = process.env.VITE_BASE_PATH || (repository && repository[1] !== `${repository[0]}.github.io` ? `/${repository[1]}/` : '/');
const liveURL = process.env.PLAYWRIGHT_LIVE_URL;
const previewURL = liveURL || `http://127.0.0.1:4173${basePath}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: previewURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { ...devices['iPad Mini'], browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'mobile-small', use: { ...devices['iPhone SE'], browserName: 'chromium', viewport: { width: 320, height: 568 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
  webServer: liveURL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: previewURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
