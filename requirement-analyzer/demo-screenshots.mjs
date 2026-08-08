/**
 * Playwright 浏览器演示 — 自动截图项目核心页面
 */
import { chromium } from '@playwright/test';

const APP = 'http://localhost:5173';
const USER = { username: 'e2e_tester', password: 'e2e123456' };
const OUT = 'demo-screenshots';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. 登录页
  console.log('1/5 截图：登录页...');
  await page.goto(`${APP}/login`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/01-login-page.png`, fullPage: false });

  // 2. 登录
  console.log('2/5 截图：登录中...');
  await page.locator('input[type="text"]').fill(USER.username);
  await page.locator('input[type="password"]').fill(USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/projects', { timeout: 8000 });

  // 3. 项目列表
  console.log('3/5 截图：项目列表...');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/02-projects-list.png`, fullPage: false });

  // 4. 创建一个项目并进入分析页
  console.log('4/5 截图：创建项目...');
  const name = `Demo_${Date.now()}`;
  await page.locator('button', { hasText: '创建项目' }).click();
  await page.waitForTimeout(300);
  await page.locator('input[placeholder*="项目名称"]').fill(name);
  await page.locator('button', { hasText: '确认创建' }).click();
  await page.waitForSelector('h3', { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/03-project-created.png`, fullPage: false });

  // 5. 进入分析页，上传测试文件
  await page.locator('h3').filter({ hasText: name }).click();
  await page.waitForURL('**/projects/*', { timeout: 5000 });
  console.log('5/5 截图：分析页（上传文件）...');
  await page.waitForTimeout(500);

  const testFile = import.meta.resolve('./tests/test-data/test_sample.txt').replace('file:///', '');

  await page.locator('input[type="file"]').setInputFiles(testFile);
  await page.waitForSelector('table', { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-analysis-result.png`, fullPage: false });

  await browser.close();
  console.log(`\n✅ 完成！截图保存在 ${OUT}/ 目录`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
