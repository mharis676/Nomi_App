import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir: './e2e-server', workers: 1, retries: 0,
 reporter: [['list'], ['html', { outputFolder: 'playwright-server-report', open: 'never' }]],
 use: { baseURL: 'http://127.0.0.1:3001', ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
 webServer: {
  command: 'npm run build && npx tsx test/integration/run-app.ts', url: 'http://127.0.0.1:3001/healthz', timeout: 90_000,
  env: { VITE_DATA_MODE: 'server', VITE_SUPABASE_URL: 'http://127.0.0.1:55440', VITE_SUPABASE_ANON_KEY: 'test-public-key' },
 },
});
