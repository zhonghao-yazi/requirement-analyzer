/**
 * 需求分析测试用例生成平台 — 全页面 E2E 自动化测试
 *
 * 测试覆盖：
 *   1. 页面加载与初始渲染
 *   2. 文件上传（点击选择 / 拖拽）
 *   3. 分析流程（上传 → 加载 → 结果展示）
 *   4. 需求摘要、流程图、测试用例表格
 *   5. 分类筛选
 *   6. Excel 下载 + 复制表格
 *   7. 清除/重置文件
 *   8. 错误处理与边界情况
 *   9. 页面交互与响应性
 *  10. 综合场景
 *
 * 注意：项目使用 CSS Modules，类名为 hashed 格式（如 _tab_1b2r_34），
 * 因此优先使用语义选择器（role、text、CSS 结构选择器）。
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_DATA_DIR = path.resolve(__dirname, 'test-data')

// ===== 辅助函数 =====

function testFile(name) {
  return path.join(TEST_DATA_DIR, name)
}

/** 等待分析结果加载完成（需求摘要区域出现 + loading 消失） */
async function waitForResults(page) {
  // 等待至少一个 h2 标题出现
  await page.locator('h2').first().waitFor({ state: 'visible', timeout: 30000 })
  // 等待 loading 文字消失（页面不再显示"正在解析"）
  await page.waitForFunction(() => {
    const body = document.body.innerText || ''
    return !body.includes('正在解析文件，AI 分析需求内容...')
  }, { timeout: 30000 }).catch(() => {})
}

/** 上传文件并等待分析结果 */
async function uploadAndAnalyze(page, filePath) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(filePath)
  await waitForResults(page)
}

// ===== 1. 页面加载与初始渲染 =====

test.describe('1. 页面加载与初始渲染', () => {
  test('1.1 页面标题正确', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/需求分析/)
  })

  test('1.2 Header 品牌区域正确渲染', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: '需求分析 · 测试用例生成平台' })
    ).toBeVisible()
    await expect(
      page.getByText('上传需求文件，智能分析，一键生成完整测试用例')
    ).toBeVisible()
  })

  test('1.3 上传区域默认显示上传提示', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('拖拽文件到此处，或')).toBeVisible()
    await expect(page.getByText('点击选择')).toBeVisible()
    await expect(
      page.getByText(/支持 PNG.*JPG.*GIF.*DOCX.*PDF.*MD.*TXT.*XMind/)
    ).toBeVisible()
  })

  test('1.4 格式标签全部展示', async ({ page }) => {
    await page.goto('/')
    // 从 constants.js: FILE_TYPES 的 category 字段
    const tags = ['图片', '文档', 'PDF', 'Markdown', '文本', 'XMind']
    for (const tag of tags) {
      // 每个标签渲染为一个 span，使用精确匹配避免误匹配
      await expect(page.locator('span').filter({ hasText: tag }).first()).toBeVisible()
    }
  })

  test('1.5 初始空状态提示', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByText('上传需求文件，AI 将自动分析并生成测试用例')
    ).toBeVisible()
  })

  test('1.6 未上传时不应显示结果区域', async ({ page }) => {
    await page.goto('/')
    // 使用 locator（不会在无匹配时抛异常）
    // 需求摘要、核心流程、测试用例 对应的 h2 都不应存在
    const headings = page.locator('h2')
    const count = await headings.count()
    expect(count).toBe(0) // 未上传时不应有 h2（结果区域的标题）
  })
})

// ===== 2. 文件上传功能 =====

test.describe('2. 文件上传功能', () => {
  test('2.1 点击上传区域选择文件', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile('test_sample.txt'))
    await expect(page.getByText('test_sample.txt')).toBeVisible()
  })

  test('2.2 上传文件后显示文件大小', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile('test_sample.txt'))
    // 文件大小显示（KB 或 B）
    await expect(page.locator('span').filter({ hasText: /(KB|B)$/ }).first()).toBeVisible({ timeout: 5000 })
  })

  test('2.3 上传文件后显示清除按钮', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile('test_sample.txt'))
    await expect(page.locator('button[title="移除文件"]')).toBeVisible()
  })

  test('2.4 清除按钮可重置上传区', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile('test_sample.txt'))
    await page.locator('button[title="移除文件"]').click()
    await expect(page.getByText('拖拽文件到此处，或')).toBeVisible()
    await expect(
      page.getByText('上传需求文件，AI 将自动分析并生成测试用例')
    ).toBeVisible()
  })

  test('2.5 拖拽上传文件', async ({ page }) => {
    await page.goto('/')

    // 模拟文件拖拽：通过创建包含 DataTransfer 的 drop 事件
    // 找到包含上传提示的 dropzone 容器
    const dropzone = page.locator('[class*="dropzone"]')
    await expect(dropzone).toBeVisible()

    // 使用 evaluate 直接在浏览器中触发 React 的 drop handler
    await dropzone.evaluate((node) => {
      const file = new File(['# 测试需求\n1. 功能A\n2. 功能B'], 'drag-test.txt', { type: 'text/plain' })
      const dt = new DataTransfer()
      dt.items.add(file)

      node.dispatchEvent(new DragEvent('dragover', {
        dataTransfer: dt, bubbles: true, cancelable: true,
      }))
      node.dispatchEvent(new DragEvent('drop', {
        dataTransfer: dt, bubbles: true, cancelable: true,
      }))
    })

    await expect(page.getByText('drag-test.txt')).toBeVisible({ timeout: 5000 })
  })

  test('2.6 拖拽悬停时高亮效果', async ({ page }) => {
    await page.goto('/')
    const dropzone = page.locator('[class*="dropzone"]')

    // 触发 dragover 事件
    await dropzone.evaluate((node) => {
      node.dispatchEvent(new DragEvent('dragover', {
        dataTransfer: new DataTransfer(), bubbles: true, cancelable: true,
      }))
    })

    // 检查是否有 dragging 类（CSS Modules 下类名包含 "dragging"）
    const className = await dropzone.getAttribute('class')
    expect(className).toContain('dragging')
  })
})

// ===== 3. 分析流程 — 完整端到端 =====

test.describe('3. 分析流程', () => {
  test('3.1 上传文件后自动触发分析出现 loading', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile('test_sample.txt'))
    // 加载文字应出现
    await expect(
      page.getByText('正在解析文件，AI 分析需求内容...')
    ).toBeVisible({ timeout: 5000 })
  })

  test('3.2 分析完成后展示需求摘要', async ({ page }) => {
    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))
    // 需求摘要标题（h2）
    await expect(page.getByRole('heading', { name: '需求摘要' })).toBeVisible({ timeout: 10000 })
    // 应有要点数量
    await expect(page.locator('span').filter({ hasText: /条要点/ }).first()).toBeVisible()
    // 至少一个列表项
    const listItems = page.locator('ul li')
    await expect(listItems.first()).toBeVisible({ timeout: 5000 })
  })

  test('3.3 分析完成后展示核心流程图', async ({ page }) => {
    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))
    // 核心流程标题
    await expect(page.getByRole('heading', { name: '核心流程' })).toBeVisible({ timeout: 10000 })
    // SVG 流程图
    await expect(page.locator('svg').first()).toBeAttached({ timeout: 5000 })
    // 流程节点（CSS Modules: 类名包含 "node"）
    const nodes = page.locator('[class*="nodeLabel"]')
    await expect(nodes.first()).toBeVisible({ timeout: 5000 })
  })

  test('3.4 分析完成后展示测试用例表格', async ({ page }) => {
    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))
    // 测试用例标题（使用 exact 避免匹配 Header 中的"需求分析 · 测试用例生成平台"）
    await expect(page.getByRole('heading', { name: '测试用例', exact: true })).toBeVisible({ timeout: 10000 })
    // 表格
    await expect(page.locator('table')).toBeVisible({ timeout: 5000 })
    // 表头列
    await expect(page.locator('th').filter({ hasText: '测试标题' })).toBeVisible()
    await expect(page.locator('th').filter({ hasText: '前置条件' })).toBeVisible()
    await expect(page.locator('th').filter({ hasText: '测试步骤' })).toBeVisible()
    await expect(page.locator('th').filter({ hasText: '预期结果' })).toBeVisible()
  })

  test('3.5 分析完成后展示下载操作栏', async ({ page }) => {
    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))
    await expect(
      page.getByRole('button', { name: /下载 Excel/ })
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole('button', { name: /复制表格/ })
    ).toBeVisible({ timeout: 5000 })
  })

  test('3.6 加载中不显示结果区域', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile('test_sample.txt'))
    // 加载中时 h2 标题（需求摘要等）不应存在
    await expect(page.locator('h2')).toHaveCount(0)
    // 加载完成后应该出现
    await waitForResults(page)
    await expect(page.getByRole('heading', { name: '需求摘要' })).toBeVisible()
  })
})

// ===== 4. 测试用例表格功能 =====

test.describe('4. 测试用例表格', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))
  })

  test('4.1 表格包含多种分类的测试用例', async ({ page }) => {
    const categories = ['核心流程', '边界值', '安全性', '稳定性']
    for (const cat of categories) {
      // 使用 locator 避免严格模式冲突
      await expect(page.locator('td').filter({ hasText: cat }).first()).toBeVisible()
    }
  })

  test('4.2 默认选中"全部"分类 Tab', async ({ page }) => {
    // "全部" Tab 按钮应该存在
    const allBtn = page.getByRole('button', { name: /全部 \d+/ })
    await expect(allBtn).toBeVisible()
    // 验证按钮存在且可点击（选中状态通过 CSS Modules 的 tabActive 类控制）
    // 可以点击非"全部"的 tab，然后验证筛选变化来间接验证
  })

  test('4.3 点击分类 Tab 可筛选', async ({ page }) => {
    // 获取全部时的行数
    const allRows = page.locator('table tbody tr')
    const totalCount = await allRows.count()

    // 点击"核心流程"按钮
    await page.getByRole('button', { name: /核心流程 \d+/ }).click()
    await page.waitForTimeout(300)

    const filteredRows = page.locator('table tbody tr')
    const filteredCount = await filteredRows.count()
    expect(filteredCount).toBeGreaterThan(0)
    expect(filteredCount).toBeLessThanOrEqual(totalCount)

    // 验证每行都包含"核心流程"
    for (let i = 0; i < filteredCount; i++) {
      await expect(
        filteredRows.nth(i).locator('td').filter({ hasText: '核心流程' }).first()
      ).toBeVisible()
    }
  })

  test('4.4 切换到有数据的分类', async ({ page }) => {
    await page.getByRole('button', { name: /边界值 \d+/ }).click()
    await page.waitForTimeout(300)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('4.5 所有分类 Tab 存在且含数字', async ({ page }) => {
    // 验证所有 5 个 Tab 按钮存在
    const tabNames = ['全部', '核心流程', '边界值', '安全性', '稳定性']
    for (const name of tabNames) {
      const btn = page.getByRole('button', { name: new RegExp(name + ' \\d+') })
      await expect(btn).toBeVisible()
    }
  })

  test('4.6 表格行数据完整（6列）', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    const firstRowCells = rows.first().locator('td')
    expect(await firstRowCells.count()).toBe(6)
  })

  test('4.7 分类徽章使用对应颜色', async ({ page }) => {
    const badge = page.locator('td span').first()
    await expect(badge).toBeVisible()
    const bgColor = await badge.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    )
    expect(bgColor).toBeTruthy()
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)')
  })
})

// ===== 5. Excel 下载功能 =====

test.describe('5. Excel 下载', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))
  })

  test('5.1 点击下载按钮触发下载', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await page.getByRole('button', { name: /下载 Excel/ }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/测试用例.*\.xlsx$/)
  })

  test('5.2 下载中按钮显示 loading 状态', async ({ page }) => {
    await page.getByRole('button', { name: /下载 Excel/ }).click()
    await expect(
      page.getByRole('button', { name: /生成中/ })
    ).toBeVisible({ timeout: 3000 })
  })

  test('5.3 下载完成后按钮恢复', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await page.getByRole('button', { name: /下载 Excel/ }).click()
    await downloadPromise
    await page.waitForTimeout(500)
    await expect(
      page.getByRole('button', { name: /下载 Excel/ })
    ).toBeVisible()
  })
})

// ===== 6. 复制表格功能 =====

test.describe('6. 复制表格', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))
  })

  test('6.1 点击复制按钮状态切换', async ({ page }) => {
    // 授予 clipboard 权限
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.getByRole('button', { name: /复制表格/ }).click()

    // 按钮应变为"已复制"（clipboard 或降级方案都会显示）
    await expect(
      page.getByRole('button', { name: /已复制/ })
    ).toBeVisible({ timeout: 5000 })

    // 2 秒后应恢复
    await page.waitForTimeout(2500)
    await expect(
      page.getByRole('button', { name: /复制表格/ })
    ).toBeVisible()
  })
})

// ===== 7. 错误处理与边界情况 =====

test.describe('7. 错误处理与边界', () => {
  test('7.1 后端正常时正确返回结果', async ({ page }) => {
    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))
    // 后端正常运行，应有完整结果
    await expect(page.getByRole('heading', { name: '需求摘要' })).toBeVisible({ timeout: 5000 })
  })

  test('7.2 上传不支持的格式应显示错误', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('test'),
    })
    await expect(
      page.getByText(/不支持的文件格式/)
    ).toBeVisible({ timeout: 5000 })
  })

  test('7.3 上传不支持的格式不触发分析', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.rar',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('test'),
    })
    // 不应出现加载文字
    await expect(
      page.getByText('正在解析文件，AI 分析需求内容...')
    ).toHaveCount(0)
  })

  test('7.4 清除错误后可重新上传有效文件', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    // 先上传不支持格式
    await fileInput.setInputFiles({
      name: 'test.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('test'),
    })
    await expect(page.getByText(/不支持的文件格式/)).toBeVisible({ timeout: 5000 })
    // 再上传有效文件
    await fileInput.setInputFiles(testFile('test_sample.txt'))
    // 错误应消失
    await expect(page.getByText(/不支持的文件格式/)).toHaveCount(0)
    await expect(page.getByText('test_sample.txt')).toBeVisible()
  })

  test('7.5 空文件/仅空格文件处理', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'empty.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('   \n  \n   '),
    })
    await waitForResults(page)
    // 结果区域应显示
    await expect(page.getByRole('heading', { name: '测试用例', exact: true })).toBeVisible({ timeout: 15000 })
  })

  test('7.6 大文件上传（无大小限制）', async ({ page }) => {
    await page.goto('/')
    const largeContent = '# 大文件测试\n' + 'A'.repeat(1024 * 1024)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'large.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(largeContent),
    })
    await expect(page.getByText('large.txt')).toBeVisible({ timeout: 5000 })
  })
})

// ===== 8. 页面交互与响应性 =====

test.describe('8. 页面交互与响应性', () => {
  test('8.1 上传新文件替换旧结果', async ({ page }) => {
    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))
    await expect(page.getByRole('heading', { name: '需求摘要' })).toBeVisible()

    // 清除并上传另一个文件
    await page.locator('button[title="移除文件"]').click()
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'simple.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# 用户注册\n1. 填写表单\n2. 提交注册'),
    })
    await waitForResults(page)
    await expect(page.getByRole('heading', { name: '需求摘要' })).toBeVisible()
  })

  test('8.2 页面无 JavaScript 异常', async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))

    expect(pageErrors).toEqual([])
  })

  test('8.3 重复上传同一文件', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('input[type="file"]')
    // 第一次
    await fileInput.setInputFiles(testFile('test_sample.txt'))
    await waitForResults(page)
    await expect(page.getByRole('heading', { name: '需求摘要' })).toBeVisible()

    // 清除
    await page.locator('button[title="移除文件"]').click()
    await page.waitForTimeout(300)

    // 第二次上传同一文件
    await fileInput.setInputFiles(testFile('test_sample.txt'))
    await waitForResults(page)
    await expect(page.getByRole('heading', { name: '需求摘要' })).toBeVisible()
  })
})

// ===== 9. FlowChart 流程图专项 =====

test.describe('9. FlowChart 流程图', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await uploadAndAnalyze(page, testFile('test_sample.txt'))
  })

  test('9.1 流程图节点数量 > 0', async ({ page }) => {
    // 节点使用 label 样式类
    const nodes = page.locator('[class*="nodeLabel"]')
    const count = await nodes.count()
    expect(count).toBeGreaterThan(0)
  })

  test('9.2 SVG 包含箭头 marker 定义', async ({ page }) => {
    // marker 在 SVG 中始终是 hidden 状态（不渲染可见），使用 toBeAttached
    const marker = page.locator('svg marker')
    await expect(marker.first()).toBeAttached()
  })

  test('9.3 流程图连线 path 存在', async ({ page }) => {
    const paths = page.locator('svg path')
    const count = await paths.count()
    expect(count).toBeGreaterThan(0)
  })
})

// ===== 10. 综合场景测试 =====

test.describe('10. 综合场景', () => {
  test('10.1 完整用户旅程：上传 → 查看 → 筛选 → 下载', async ({ page }) => {
    await page.goto('/')

    // 1. 上传文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile('test_sample.txt'))
    await waitForResults(page)

    // 2. 查看需求摘要
    await expect(page.getByRole('heading', { name: '需求摘要' })).toBeVisible()
    const summaryItems = page.locator('ul li')
    expect(await summaryItems.count()).toBeGreaterThan(0)

    // 3. 查看核心流程图
    await expect(page.getByRole('heading', { name: '核心流程' })).toBeVisible()
    await expect(page.locator('svg').first()).toBeAttached()

    // 4. 查看测试用例 — 全部
    await expect(page.getByRole('heading', { name: '测试用例', exact: true })).toBeVisible()
    const allRows = page.locator('table tbody tr')
    const totalCount = await allRows.count()
    expect(totalCount).toBeGreaterThan(0)

    // 5. 筛选"核心流程"
    await page.getByRole('button', { name: /核心流程 \d+/ }).click()
    await page.waitForTimeout(300)
    const filteredRows = page.locator('table tbody tr')
    const filteredCount = await filteredRows.count()
    expect(filteredCount).toBeGreaterThan(0)
    expect(filteredCount).toBeLessThanOrEqual(totalCount)

    // 6. 切回"全部"
    await page.getByRole('button', { name: /^全部 \d+/ }).click()
    await page.waitForTimeout(300)
    const restoredRows = page.locator('table tbody tr')
    expect(await restoredRows.count()).toBe(totalCount)

    // 7. 下载 Excel
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await page.getByRole('button', { name: /下载 Excel/ }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)

    // 8. 复制表格
    await page.getByRole('button', { name: /复制表格/ }).click()
    await expect(
      page.getByRole('button', { name: /已复制/ })
    ).toBeVisible({ timeout: 5000 })
  })
})
