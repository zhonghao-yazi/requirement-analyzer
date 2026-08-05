import { chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_FILE = path.resolve(__dirname, 'tests', 'test-data', 'test_sample.txt')

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

// 清理 localStorage 避免旧数据干扰
await page.goto('http://localhost:5173')
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })

// 上传并等待分析
const fi = page.locator('input[type="file"]')
await fi.setInputFiles(TEST_FILE)
await page.locator('h2').first().waitFor({ state: 'visible', timeout: 30000 })
await page.waitForFunction(() => !document.body.innerText.includes('正在解析'), { timeout: 30000 }).catch(() => {})

let passed = 0
let failed = 0
function check(name, ok, detail = '') {
  if (ok) { console.log(`  ✅ ${name}`); passed++ }
  else { console.log(`  ❌ ${name} ${detail}`); failed++ }
}

// 获取当前页信息
async function getPageInfo() {
  const infoText = await page.locator('[class*="pageInfo"]').textContent()
  const rows = await page.locator('table tbody tr').count()
  const pageSizeText = await page.locator('select').last().evaluate(el => el.value)
  return { infoText, rows, pageSize: Number(pageSizeText) }
}

console.log('=== 分页功能测试 ===\n')

// 1. 分页控件可见
const paginationVisible = (await page.locator('[class*="pagination"]').count()) > 0
check('分页控件可见', paginationVisible)

// 2. 默认10条/页，11条数据 = 第1页10条
const info = await getPageInfo()
check('默认10条/页', info.pageSize === 10, `实际: ${info.pageSize}`)
check('第1页显示10行(共11条)', info.rows === 10 && info.infoText.includes('共 11 条'), `行数:${info.rows}, info:${info.infoText}`)

// 3. 第2页（点击页码按钮 "2"，不是分类Tab）
await page.locator('[class*="pageNum"]').filter({ hasText: /^2$/ }).click()
await page.waitForTimeout(300)
const page2 = await getPageInfo()
check('第2页显示1行(共11条,10条/页)', page2.rows === 1, `实际行数:${page2.rows}, info:${page2.infoText}`)

// 4. 点击"上一页"切回第1页
await page.locator('[class*="pageBtn"]').first().click()
await page.waitForTimeout(300)
const back = await getPageInfo()
check('切回第1页10行', back.rows === 10, `实际: ${back.rows}`)

// 5. 切换20条/页
await page.locator('select').last().selectOption('20')
await page.waitForTimeout(300)
const page20 = await getPageInfo()
check('切换20条/页→全部11行', page20.rows === 11 && page20.pageSize === 20, `行数:${page20.rows}`)

// 6. 页码按钮高亮
const activeBtn = await page.locator('[class*="pageNumActive"]').textContent()
check('当前页按钮active', activeBtn === '1', `实际: ${activeBtn}`)

// 7. 新增用例后页码扩展
// 先切回10条/页
await page.locator('select').last().selectOption('10')
await page.waitForTimeout(300)
// 新增3条 → 总共14条 → 第1页10条，第2页4条
for (let i = 0; i < 3; i++) {
  await page.locator('button').filter({ hasText: '添加' }).first().click()
  await page.waitForTimeout(200)
  await page.locator('[class*="fieldInput"]').first().fill(`分页测试用例${i + 1}`)
  await page.locator('button').filter({ hasText: '添加用例' }).click()
  await page.waitForTimeout(300)
}
const afterAdd = await getPageInfo()
check('新增3条后第1页仍10行', afterAdd.rows === 10, `实际: ${afterAdd.rows}`)
check('总数变为14条', afterAdd.infoText.includes('共 14 条'), `info: ${afterAdd.infoText}`)

// 8. 筛选后页码重置
await page.getByRole('button', { name: /核心流程 \d+/ }).click()
await page.waitForTimeout(300)
const afterFilter = await getPageInfo()
check('筛选核心流程→重置到第1页', afterFilter.rows <= afterFilter.pageSize, `行数:${afterFilter.rows}`)
// 切回全部
await page.getByRole('button', { name: /^全部 \d+/ }).click()
await page.waitForTimeout(300)
const afterAll = await getPageInfo()
check('切回全部→重置到第1页10行', afterAll.rows === 10, `行数:${afterAll.rows}`)

console.log(`\n═══════════════════`)
console.log(`  分页测试: ${passed}/${passed + failed} 通过`)
console.log(`═══════════════════`)

await browser.close()
