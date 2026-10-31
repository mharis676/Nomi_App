import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir: './e2e-local', workers: 2,
 reporter: [['list'], ['html', { outputFolder: 'playwright-local-report', open: 'never' }]],
 use: { baseURL: 'http://127.0.0.1:5187', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
 projects: [
 { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined } },
 { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: process.env.PW_CHANNEL || undefined } },
 ],
 webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 5187', url: 'http://127.0.0.1:5187', env: { VITE_DATA_MODE: 'local' }, timeout: 90_000 },
});
