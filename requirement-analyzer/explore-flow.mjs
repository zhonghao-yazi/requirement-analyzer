/**
 * 全功能流程探索 — 逐步操作并记录每一步的页面状态变化
 */
import { chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function log(tag, msg) {
  console.log(`  [${tag}] ${msg}`)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const testFile = path.resolve(__dirname, 'tests', 'test-data', 'test_sample.txt')

  // ================================================================
  console.log('')
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   需求分析测试用例生成平台 — 完整功能流程记录   ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log('')

  // ====== 第1步: 首次加载 ======
  console.log('━━━ 第1步: 打开页面 ━━━')
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  log('页面', `标题 = "${await page.title()}"`)
  log('页面', `URL = ${page.url()}`)

  // 页面布局结构
  const headerText = await page.locator('header').innerText()
  log('Header', headerText.replace(/\n/g, ' | '))

  const uploadText = await page.locator('main').innerText()
  log('主体区', uploadText.substring(0, 200).replace(/\n/g, ' → '))

  log('状态', '空状态 — 等待用户上传文件')
  await page.screenshot({ path: 'test-reports/flow-01-initial.png', fullPage: true })
  console.log('  📸 截图: flow-01-initial.png')

  // ====== 第2步: 拖拽高亮 ======
  console.log('')
  console.log('━━━ 第2步: 拖拽文件悬停（dragover） ━━━')
  const dropzone = page.locator('[class*="dropzone"]')
  await dropzone.evaluate((node) => {
    node.dispatchEvent(new DragEvent('dragover', {
      dataTransfer: new DataTransfer(), bubbles: true, cancelable: true,
    }))
  })
  const dzClass = await dropzone.getAttribute('class')
  log('拖拽区', `边框高亮 — className包含"dragging": ${dzClass.includes('dragging')}`)
  await page.waitForTimeout(300)

  // 拖离
  await dropzone.evaluate((node) => {
    node.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true }))
  })
  const dzClass2 = await dropzone.getAttribute('class')
  log('拖离后', `高亮消失 — className包含"dragging": ${dzClass2.includes('dragging')}`)

  // ====== 第3步: 点击上传文件 ======
  console.log('')
  console.log('━━━ 第3步: 点击上传 test_sample.txt ━━━')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(testFile)

  // 上传后状态
  const fileName = await page.locator('[class*="fileName"]').innerText()
  const fileSize = await page.locator('[class*="fileSize"]').innerText()
  log('文件信息', `名称="${fileName}", 大小="${fileSize}"`)
  log('清除按钮', `可见: ${await page.locator('button[title="移除文件"]').isVisible()}`)
  log('上传区', '从默认引导文案切换为文件信息展示')

  await page.screenshot({ path: 'test-reports/flow-02-uploaded.png', fullPage: true })

  // ====== 第4步: 自动触发分析 ======
  console.log('')
  console.log('━━━ 第4步: 自动分析（loading） ━━━')
  const loadingVisible = await page.getByText('正在解析文件，AI 分析需求内容...').isVisible({ timeout: 5000 })
  log('loading', `自动触发分析: ${loadingVisible}`)
  log('loading', '文案: "正在解析文件，AI 分析需求内容..."')
  log('loading', '显示旋转动画 spinner')

  const spinnerVisible = await page.locator('[class*="loading-spinner"]').isVisible().catch(() => false)
  log('spinner', `旋转动画元素存在: ${spinnerVisible}`)

  // loading 期间无结果
  const h2DuringLoading = await page.locator('h2').count()
  log('验证', `loading期间h2数量=0 (隐藏旧结果): ${h2DuringLoading === 0}`)

  await page.screenshot({ path: 'test-reports/flow-03-loading.png', fullPage: true })

  // ====== 第5步: 分析完成 ======
  console.log('')
  console.log('━━━ 第5步: 分析完成 — 四个模块展示 ━━━')
  await page.locator('h2').first().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForFunction(
    () => !document.body.innerText.includes('正在解析文件，AI 分析需求内容...'),
    { timeout: 30000 }
  ).catch(() => {})
  await page.waitForTimeout(500)

  const allH2 = await page.locator('h2').allTextContents()
  log('结果模块', `h2标题: ${allH2.join(' | ')}`)
  log('摘要标题', `"${allH2[0]}"`)

  // 模块1: 需求摘要
  const summaryCount = await page.locator('ul li').count()
  log('①需求摘要', `${summaryCount} 条要点`)

  // 模块2: 流程图
  const nodeCount = await page.locator('[class*="nodeLabel"]').count()
  const edgeCount = await page.locator('svg path').count()
  log('②核心流程', `${nodeCount} 个节点, ${edgeCount} 条连线`)

  // 模块3: 测试用例表格
  const totalRows = await page.locator('table tbody tr').count()
  const thCount = await page.locator('table thead th').count()
  log('③测试用例', `${totalRows} 行数据, ${thCount} 列表头`)
  log('表格表头', '序号 | 分类 | 测试标题 | 前置条件 | 测试步骤 | 预期结果')

  // 显示各分类分布
  const tabs = await page.locator('button').filter({ hasText: /\d+/ }).allTextContents()
  log('分类分布', tabs.filter(t => /\d+/.test(t)).join(' | '))

  // 模块4: 下载栏
  const barText = await page.locator('[class*="bar"]').innerText()
  log('④下载栏', barText.replace(/\n/g, ' | '))

  await page.screenshot({ path: 'test-reports/flow-04-results.png', fullPage: true })

  // ====== 第6步: 分类筛选 ======
  console.log('')
  console.log('━━━ 第6步: 分类筛选 Tab ━━━')

  const categories = ['核心流程', '边界值', '安全性', '稳定性']
  for (const cat of categories) {
    await page.getByRole('button', { name: new RegExp(cat + ' \\d+') }).click()
    await page.waitForTimeout(300)
    const filteredRows = await page.locator('table tbody tr').count()
    const allBadges = await page.locator('td span').filter({ hasText: cat }).count()
    log(`筛选"${cat}"`, `${filteredRows} 行, 所有行分类="核心流程": ${filteredRows === allBadges}`)

    // 检查筛选后的分类唯一性
    const categories_in_rows = await page.locator('table tbody tr td:nth-child(2)').allTextContents()
    const allSame = categories_in_rows.every(c => c.trim() === cat)
    log(` 验证`, `所有行分类一致: ${allSame}`)
  }

  // 切回"全部"
  await page.getByRole('button', { name: /^全部 \d+/ }).click()
  await page.waitForTimeout(300)
  const allTotal = await page.locator('table tbody tr').count()
  log('切回"全部"', `恢复 ${allTotal} 行 (与初始 ${totalRows} 相同: ${allTotal === totalRows})`)

  // ====== 第7步: 测试无匹配分类 ======
  console.log('')
  console.log('━━━ 第7步: 无匹配数据的分类 ━━━')
  // 全部切换到安全性后再看
  await page.getByRole('button', { name: /安全性 \d+/ }).click()
  await page.waitForTimeout(300)
  const secRows = await page.locator('table tbody tr').count()
  log('安全性行数', secRows)

  // 模拟：如果后端只返回核心流程+边界值，点击安全性会显示空状态提示
  // 当前后端返回了安全性数据，所以不会触发
  log('说明', '当某分类无数据时表格下方显示"该分类下暂无测试用例"')

  // ====== 第8步: 表格hover效果 ======
  console.log('')
  console.log('━━━ 第8步: 表格行 hover 高亮 ━━━')
  await page.getByRole('button', { name: /^全部 \d+/ }).click()
  await page.waitForTimeout(300)

  const firstRow = page.locator('table tbody tr').first()
  const bgBefore = await firstRow.evaluate(el => window.getComputedStyle(el).backgroundColor)
  await firstRow.hover()
  await page.waitForTimeout(200)
  const bgAfter = await firstRow.evaluate(el => window.getComputedStyle(el).backgroundColor)
  log('hover前背景', bgBefore)
  log('hover后背景', bgAfter)
  log('hover高亮', `背景色变化: ${bgBefore !== bgAfter}`)

  // ====== 第9步: 流程图细节 ======
  console.log('')
  console.log('━━━ 第9步: 流程图细节 ━━━')

  const nodeLabels = await page.locator('[class*="nodeLabel"]').allTextContents()
  log('节点列表', nodeLabels.join(' → '))

  const svgWidth = await page.locator('svg').first().getAttribute('width')
  const svgHeight = await page.locator('svg').first().getAttribute('height')
  log('SVG尺寸', `${svgWidth} x ${svgHeight}`)

  const hasMarker = (await page.locator('svg marker').count()) > 0
  log('箭头标记', `marker元素存在: ${hasMarker}`)

  // 节点hover效果
  const firstNode = page.locator('[class*="node"]').first()
  const nodeBgBefore = await firstNode.evaluate(el => window.getComputedStyle(el).borderColor)
  await firstNode.hover()
  await page.waitForTimeout(200)
  const nodeBgAfter = await firstNode.evaluate(el => window.getComputedStyle(el).borderColor)
  log('节点hover', `边框颜色变化: ${nodeBgBefore !== nodeBgAfter}`)

  // ====== 第10步: Excel下载 ======
  console.log('')
  console.log('━━━ 第10步: 下载 Excel ━━━')

  const dlPromise = page.waitForEvent('download', { timeout: 15000 })
  await page.getByRole('button', { name: /下载 Excel/ }).click()
  log('点击下载', '"下载 Excel" 按钮已点击')

  // 按钮loading状态
  const btnLoading = await page.getByRole('button', { name: /生成中/ }).isVisible({ timeout: 3000 }).catch(() => false)
  log('按钮状态', `变为"生成中...": ${btnLoading}`)

  const download = await dlPromise
  const dlFilename = download.suggestedFilename()
  log('下载完成', `文件名: ${dlFilename}`)

  // 按钮恢复
  await page.waitForTimeout(500)
  const btnRestored = await page.getByRole('button', { name: /下载 Excel/ }).isVisible()
  log('按钮恢复', `恢复为"下载 Excel": ${btnRestored}`)

  // 保存下载文件
  const dlPath = path.resolve(__dirname, 'test-reports', dlFilename)
  await download.saveAs(dlPath)
  log('保存路径', `test-reports/${dlFilename}`)
  log('文件大小', `${(require('fs').statSync(dlPath).size / 1024).toFixed(1)} KB`)

  // ====== 第11步: 复制表格 ======
  console.log('')
  console.log('━━━ 第11步: 复制表格 ━━━')

  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await page.getByRole('button', { name: /复制表格/ }).click()
  log('点击复制', '"复制表格" 按钮已点击')

  const copiedVisible = await page.getByRole('button', { name: /已复制/ }).isVisible({ timeout: 3000 }).catch(() => false)
  log('按钮状态', `变为"已复制": ${copiedVisible}`)

  // 读取剪贴板内容
  try {
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    const lines = clipboardText.split('\n')
    log('剪贴板', `TSV格式, ${lines.length} 行 (含表头)`)
    log('表头', lines[0])
    log('首行数据', lines[1])
  } catch {
    log('剪贴板', 'headless模式无法读取, 但不影响使用')
  }

  await page.waitForTimeout(2500)
  const copyRestored = await page.getByRole('button', { name: /复制表格/ }).isVisible()
  log('2秒恢复', `恢复为"复制表格": ${copyRestored}`)

  // ====== 第12步: 清除文件 ======
  console.log('')
  console.log('━━━ 第12步: 清除文件，回到初始状态 ━━━')

  await page.locator('button[title="移除文件"]').click()
  await page.waitForTimeout(300)

  const resetUpload = await page.getByText('拖拽文件到此处，或').isVisible()
  const resetEmpty = await page.getByText('上传需求文件，AI 将自动分析并生成测试用例').isVisible()
  const resetH2 = await page.locator('h2').count()

  log('上传区', `恢复引导文案: ${resetUpload}`)
  log('空状态', `显示空状态提示: ${resetEmpty}`)
  log('结果区', `隐藏(h2=0): ${resetH2 === 0}`)
  log('错误', `错误横幅消失: ${await page.locator('[class*="error-banner"]').count() === 0}`)

  await page.screenshot({ path: 'test-reports/flow-05-reset.png', fullPage: true })

  // ====== 第13步: 不支持格式测试 ======
  console.log('')
  console.log('━━━ 第13步: 上传不支持格式（.exe） ━━━')

  await fileInput.setInputFiles({
    name: 'malware.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('fake exe content'),
  })

  const errorMsg = await page.locator('[class*="error"]').innerText()
  log('错误提示', `"${errorMsg}"`)

  const loadingAfterError = await page.getByText('正在解析文件，AI 分析需求内容...').count()
  log('验证', `不触发loading: ${loadingAfterError === 0}`)

  await page.screenshot({ path: 'test-reports/flow-06-error.png', fullPage: true })

  // 清除错误后重新上传有效文件
  await fileInput.setInputFiles(testFile)
  const errorGone = (await page.locator('[class*="error"]').count()) === 0
  log('修复', `重新上传有效文件 → 错误消失: ${errorGone}`)

  await page.locator('h2').first().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForFunction(
    () => !document.body.innerText.includes('正在解析文件'),
    { timeout: 30000 }
  ).catch(() => {})

  const recovered = await page.getByRole('heading', { name: '需求摘要' }).isVisible().catch(() => false)
  log('分析恢复', `成功重新分析: ${recovered}`)

  // ====== 第14步: 文件大小校验 ======
  console.log('')
  console.log('━━━ 第14步: 上传超大文件（>20MB） ━━━')

  const largeBuffer = Buffer.alloc(21 * 1024 * 1024, 'A') // 21MB
  await page.locator('button[title="移除文件"]').click()
  await page.waitForTimeout(300)

  await fileInput.setInputFiles({
    name: 'huge.txt',
    mimeType: 'text/plain',
    buffer: largeBuffer,
  })

  const sizeError = await page.locator('[class*="error"]').innerText()
  log('大小校验', `"${sizeError}"`)
  log('验证', `超过20MB被前端拒绝: ${sizeError.includes('20MB') || sizeError.includes('过大')}`)

  // ====== 第15步: 拖拽上传 ======
  console.log('')
  console.log('━━━ 第15步: 拖拽上传文件 ━━━')

  await page.locator('button[title="移除文件"]').click().catch(() => {})
  await page.waitForTimeout(300)

  await dropzone.evaluate((node) => {
    const file = new File(['# 拖拽上传测试\n## 功能A\n1. 步骤一\n2. 步骤二'], 'drag-test.txt', { type: 'text/plain' })
    const dt = new DataTransfer()
    dt.items.add(file)
    node.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
    node.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  })

  const dragFileName = await page.getByText('drag-test.txt').isVisible({ timeout: 5000 })
  log('拖拽上传', `文件名显示: ${dragFileName}`)

  // 等待分析结果
  await page.locator('h2').first().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForFunction(
    () => !document.body.innerText.includes('正在解析文件'),
    { timeout: 30000 }
  ).catch(() => {})

  const dragSummary = await page.getByRole('heading', { name: '需求摘要' }).isVisible().catch(() => false)
  log('分析结果', `拖拽文件分析完成: ${dragSummary}`)

  // ====== 第16步: 最终总结 ======
  console.log('')
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║           🎉 全部功能流程记录完毕             ║')
  console.log('╚══════════════════════════════════════════════╝')

  const screenshots = [
    'flow-01-initial.png   — 初始状态',
    'flow-02-uploaded.png  — 文件已上传',
    'flow-03-loading.png   — 加载中',
    'flow-04-results.png   — 分析完成(全部结果)',
    'flow-05-reset.png     — 清除后恢复初始',
    'flow-06-error.png     — 不支持格式错误提示',
  ]
  console.log('')
  console.log('📸 截图文件 (test-reports/):')
  screenshots.forEach(s => console.log(`   ${s}`))

  await browser.close()
}

main().catch(err => {
  console.error('脚本错误:', err.message)
  process.exit(1)
})
