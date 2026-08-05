/**
 * Playwright 持久化 headed 浏览器 — 查看项目
 *
 * 用法: node open-browser.mjs [URL]
 * 默认: http://localhost:5173
 */
import { chromium } from '@playwright/test'

const url = process.argv[2] || 'http://localhost:5173'

const userDataDir = '.playwright-persistent'

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1440, height: 900 },
})

const page = context.pages()[0] || await context.newPage()
await page.goto(url)

console.log(`✅ 浏览器已打开: ${url}`)
console.log(`📁 持久化目录: ${userDataDir}`)
console.log(`🔒 关闭浏览器以退出...`)
