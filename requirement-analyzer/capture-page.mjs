/**
 * 页面内容捕获 — 展示页面文本结构
 */
import { chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // 1. 初始状态
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  console.log('=== 初始状态 ===')
  const initText = await page.locator('body').innerText()
  console.log(initText)

  // 2. 上传并分析
  const fileInput = page.locator('input[type="file"]')
  const testFile = path.resolve(__dirname, 'tests', 'test-data', 'test_sample.txt')
  await fileInput.setInputFiles(testFile)

  await page.locator('h2').first().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForFunction(
    () => !document.body.innerText.includes('正在解析文件'),
    { timeout: 30000 }
  ).catch(() => {})
  await page.waitForTimeout(500)

  console.log('\n=== 分析完成后 ===')
  const resultText = await page.locator('body').innerText()
  console.log(resultText.substring(0, 3000))

  await browser.close()
}

main()
