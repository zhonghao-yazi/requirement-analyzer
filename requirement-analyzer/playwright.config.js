import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 自动化测试配置
 *
 * 针对需求分析测试用例生成平台的全页面 E2E 测试
 * 前端: http://localhost:5173
 * 后端: http://localhost:8000
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-reports/result.json' }],
  ],

  timeout: 60000,
  expect: { timeout: 15000 },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // CI 环境下自动启动前后端服务；本地开发由外部手动启动
  webServer: process.env.CI ? [
    {
      command: 'cd ../backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000',
      port: 8000,
      timeout: 30000,
      reuseExistingServer: true,
    },
    {
      command: 'npx vite --host 0.0.0.0 --port 5173',
      port: 5173,
      timeout: 30000,
      reuseExistingServer: true,
    },
  ] : [],
})
