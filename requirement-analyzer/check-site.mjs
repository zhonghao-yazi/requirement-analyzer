/**
 * 全页面检查脚本 — 使用 Playwright 打开页面逐项验证
 */
import { chromium } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // 收集 JS 错误
  const jsErrors = []
  page.on('pageerror', err => jsErrors.push(err.message))

  // ===== 1. 页面加载检查 =====
  console.log('=== 1. 页面加载检查 ===')
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  const title = await page.title()
  console.log('页面标题:', title)

  await page.screenshot({ path: 'test-reports/check-01-init.png', fullPage: true })
  console.log('✅ 初始页面截图已保存')

  // Header
  const headerTitle = await page.getByRole('heading', { name: /需求分析/ }).textContent()
  console.log('Header 标题:', headerTitle?.trim())

  // 上传区
  const uploadText = await page.getByText('拖拽文件到此处，或').isVisible()
  console.log('上传引导文案:', uploadText ? '✅' : '❌')

  // 格式标签
  const tags = ['图片', '文档', 'PDF', 'Markdown', '文本', 'XMind']
  let tagOk = 0
  for (const tag of tags) {
    const v = await page.locator('span').filter({ hasText: tag }).first().isVisible().catch(() => false)
    if (v) tagOk++
  }
  console.log('格式标签:', tagOk + '/' + tags.length)

  // 空状态
  const emptyHint = await page.getByText('上传需求文件，AI 将自动分析并生成测试用例').isVisible()
  console.log('空状态提示:', emptyHint ? '✅' : '❌')

  // 初始无结果
  const h2Count = await page.locator('h2').count()
  console.log('初始 h2 标题数:', h2Count === 0 ? '✅ 0 (正确)' : '❌ ' + h2Count)

  // ===== 2. 文件上传测试 =====
  console.log('\n=== 2. 文件上传测试 ===')
  const testFile = path.resolve(__dirname, 'tests', 'test-data', 'test_sample.txt')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(testFile)

  const fileName = await page.getByText('test_sample.txt').isVisible({ timeout: 5000 })
  console.log('文件名显示:', fileName ? '✅' : '❌')

  const loading = await page.getByText('正在解析文件，AI 分析需求内容...').isVisible({ timeout: 5000 })
  console.log('Loading 状态:', loading ? '✅' : '❌')

  // ===== 3. 分析结果检查 =====
  console.log('\n=== 3. 分析结果检查 ===')
  await page.locator('h2').first().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForFunction(
    () => !document.body.innerText.includes('正在解析文件，AI 分析需求内容...'),
    { timeout: 30000 }
  ).catch(() => {})

  await page.screenshot({ path: 'test-reports/check-02-results.png', fullPage: true })
  console.log('✅ 分析结果截图已保存')

  const summary = await page.getByRole('heading', { name: '需求摘要' }).isVisible().catch(() => false)
  const flow = await page.getByRole('heading', { name: '核心流程' }).isVisible().catch(() => false)
  const tableTitle = await page.getByRole('heading', { name: '测试用例', exact: true }).isVisible().catch(() => false)
  const download = await page.getByRole('button', { name: /下载 Excel/ }).isVisible().catch(() => false)
  const copy = await page.getByRole('button', { name: /复制表格/ }).isVisible().catch(() => false)

  console.log('需求摘要:', summary ? '✅' : '❌')
  console.log('核心流程图:', flow ? '✅' : '❌')
  console.log('测试用例标题:', tableTitle ? '✅' : '❌')
  console.log('下载 Excel 按钮:', download ? '✅' : '❌')
  console.log('复制表格按钮:', copy ? '✅' : '❌')

  // 表格内容
  const allRows = await page.locator('table tbody tr').count()
  console.log('表格行数:', allRows)

  // 表头列
  const thCount = await page.locator('table thead th').count()
  console.log('表头列数:', thCount === 6 ? '✅ 6' : '❌ ' + thCount)

  // 分类 tab
  const tabAll = await page.getByRole('button', { name: /全部 \d+/ }).isVisible()
  const tabFlow = await page.getByRole('button', { name: /核心流程 \d+/ }).isVisible()
  const tabBoundary = await page.getByRole('button', { name: /边界值 \d+/ }).isVisible()
  const tabSecurity = await page.getByRole('button', { name: /安全性 \d+/ }).isVisible()
  const tabStability = await page.getByRole('button', { name: /稳定性 \d+/ }).isVisible()
  const tabAllOk = [tabAll, tabFlow, tabBoundary, tabSecurity, tabStability].filter(Boolean).length
  console.log('分类 Tab:', tabAllOk + '/5 可见')

  // ===== 4. 分类筛选测试 =====
  console.log('\n=== 4. 分类筛选测试 ===')
  const allRowsBefore = await page.locator('table tbody tr').count()
  await page.getByRole('button', { name: /核心流程 \d+/ }).click()
  await page.waitForTimeout(400)
  const filteredRows = await page.locator('table tbody tr').count()
  console.log('全部:', allRowsBefore, '行 → 筛选"核心流程":', filteredRows, '行')

  await page.getByRole('button', { name: /^全部 \d+/ }).click()
  await page.waitForTimeout(400)
  const restoredRows = await page.locator('table tbody tr').count()
  console.log('切回"全部":', restoredRows, '行', restoredRows === allRowsBefore ? '✅' : '❌')

  // ===== 5. 流程图检查 =====
  console.log('\n=== 5. 流程图检查 ===')
  const svgCount = await page.locator('svg').count()
  const nodeCount = await page.locator('[class*="nodeLabel"]').count()
  const pathCount = await page.locator('svg path').count()
  const markerCount = await page.locator('svg marker').count()
  console.log('SVG 存在:', svgCount > 0 ? '✅' : '❌')
  console.log('流程节点数:', nodeCount)
  console.log('连线(path)数:', pathCount)
  console.log('箭头(marker):', markerCount > 0 ? '✅' : '❌')

  // ===== 6. 下载功能测试 =====
  console.log('\n=== 6. 下载功能测试 ===')
  const dlPromise = page.waitForEvent('download', { timeout: 15000 })
  await page.getByRole('button', { name: /下载 Excel/ }).click()
  const dl = await dlPromise
  console.log('下载文件名:', dl.suggestedFilename())
  console.log('下载功能: ✅')

  // ===== 7. 复制功能测试 =====
  console.log('\n=== 7. 复制功能测试 ===')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: /复制表格/ }).click()
  const copiedBtn = await page.getByRole('button', { name: /已复制/ }).isVisible({ timeout: 5000 }).catch(() => false)
  console.log('复制按钮状态切换:', copiedBtn ? '✅ 变为"已复制"' : '❌')

  await page.waitForTimeout(2500)
  const restoredBtn = await page.getByRole('button', { name: /复制表格/ }).isVisible()
  console.log('2秒后恢复:', restoredBtn ? '✅' : '❌')

  // ===== 8. 清除重置测试 =====
  console.log('\n=== 8. 清除重置测试 ===')
  await page.locator('button[title="移除文件"]').click()
  await page.waitForTimeout(300)

  const resetUpload = await page.getByText('拖拽文件到此处，或').isVisible()
  const resetEmpty = await page.getByText('上传需求文件，AI 将自动分析并生成测试用例').isVisible()
  console.log('上传区重置:', resetUpload ? '✅' : '❌')
  console.log('空状态恢复:', resetEmpty ? '✅' : '❌')

  await page.screenshot({ path: 'test-reports/check-03-reset.png', fullPage: true })

  // ===== 9. 不支持格式测试 =====
  console.log('\n=== 9. 不支持格式测试 ===')
  await fileInput.setInputFiles({
    name: 'virus.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('malware'),
  })
  const formatError = await page.getByText(/不支持的文件格式/).isVisible({ timeout: 5000 }).catch(() => false)
  console.log('不支持格式错误提示:', formatError ? '✅' : '❌')

  // ===== 10. JS 错误检查 =====
  console.log('\n=== 10. JS 错误检查 ===')
  console.log('控制台错误数:', jsErrors.length === 0 ? '✅ 0' : '❌ ' + jsErrors.length)
  if (jsErrors.length > 0) {
    jsErrors.forEach(e => console.log('  -', e))
  }

  // ===== 总结 =====
  const allPassed = [
    title.includes('需求分析'),
    uploadText,
    emptyHint,
    h2Count === 0,
    fileName,
    loading,
    summary,
    flow,
    tableTitle,
    download,
    copy,
    allRows > 0,
    thCount === 6,
    tabAllOk === 5,
    restoredRows === allRowsBefore,
    svgCount > 0,
    nodeCount > 0,
    pathCount > 0,
    markerCount > 0,
    copiedBtn,
    restoredBtn,
    resetUpload,
    resetEmpty,
    formatError,
    jsErrors.length === 0,
  ]
  const passCount = allPassed.filter(Boolean).length
  const totalChecks = allPassed.length

  console.log('\n========================================')
  console.log(`  🎉 检查完成: ${passCount}/${totalChecks} 项通过`)
  if (passCount < totalChecks) {
    console.log(`  ❌ ${totalChecks - passCount} 项未通过`)
  }
  console.log('========================================')

  await browser.close()
}

main().catch(err => {
  console.error('检查脚本错误:', err.message)
  process.exit(1)
})
