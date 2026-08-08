/** 前端页面验证脚本 — Playwright headless */
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
  } catch (e) {
    console.log(`  [ERROR] ${e.message}`);
    results.push({ name, pass: false });
  }
}

// 1. Home page redirects to login
await check('Home redirect to /login', async () => {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  const url = page.url();
  console.log('1. URL:', url);
  if (!url.includes('/login')) throw new Error('Not redirected to /login');
});

// 2. Login page renders
await check('Login page form', async () => {
  const count = await page.locator('form').count();
  const title = await page.locator('h1').first().textContent();
  console.log('2. Title:', title, '| Forms:', count);
  if (count === 0) throw new Error('No form found');
});

// 3. Switch to register mode
await check('Switch to register mode', async () => {
  await page.locator('button', { hasText: '去注册' }).click();
  await page.waitForTimeout(300);
  const emailInputs = await page.locator('input[type="email"]').count();
  console.log('3. Email inputs:', emailInputs);
  if (emailInputs === 0) throw new Error('Email field not shown');
});

// 4. Login
await check('Login flow', async () => {
  await page.locator('button', { hasText: '去登录' }).click();
  await page.waitForTimeout(200);
  await page.locator('input[type="text"]').fill('testuser');
  await page.locator('input[type="password"]').fill('123456');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/projects', { timeout: 8000 });
  console.log('4. URL after login:', page.url());
  if (!page.url().includes('/projects')) throw new Error('Login redirect failed');
});

// 5. Projects page
await check('Projects page', async () => {
  await page.waitForTimeout(500);
  const heading = await page.locator('h2').first().textContent();
  const hasCreate = await page.locator('button', { hasText: '创建项目' }).count() > 0;
  console.log('5. Heading:', heading, '| Create btn:', hasCreate);
  if (!hasCreate) throw new Error('Create button missing');
});

// 6. Enter project
let enteredProject = false;
await check('Enter project', async () => {
  const cards = page.locator('[class*="card"]');
  const count = await cards.count();
  console.log('6. Project cards:', count);
  if (count === 0) {
    // Create a project first
    await page.locator('button', { hasText: '创建项目' }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder*="项目名称"]').fill('E2ETest');
    await page.locator('button', { hasText: '确认创建' }).click();
    await page.waitForTimeout(500);
  }
  await page.locator('[class*="card"]').first().click();
  await page.waitForURL('**/projects/*', { timeout: 5000 });
  console.log('6. Project URL:', page.url());
  if (!page.url().match(/\/projects\/\d+/)) throw new Error('Project navigation failed');
  enteredProject = true;
});

// 7. Analysis page
if (enteredProject) {
  await check('Analysis page', async () => {
    await page.waitForTimeout(500);
    const hasUpload = await page.locator('text=点击选择文件').count() > 0;
    const hasBack = await page.locator('button', { hasText: '返回' }).count() > 0;
    console.log('7. Upload zone:', hasUpload, '| Back btn:', hasBack);
    if (!hasBack) throw new Error('Back button missing');
  });
}

await browser.close();

console.log('');
console.log('========================================');
const p = results.filter(r => r.pass).length;
const f = results.filter(r => !r.pass).length;
console.log(`  Frontend: ${p} pass, ${f} fail, ${results.length} total`);
results.filter(r => !r.pass).forEach(r => console.log(`  [FAIL] ${r.name}`));
console.log('========================================');
process.exit(f > 0 ? 1 : 0);
