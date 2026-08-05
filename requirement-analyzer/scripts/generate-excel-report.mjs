/**
 * 从 Playwright JSON 报告生成 Excel 测试结果表
 *
 * 用法: node scripts/generate-excel-report.mjs
 *
 * 输入: test-reports/result.json（Playwright JSON reporter 输出）
 * 输出: test-reports/测试报告_YYYY-MM-DD_HH-mm-ss.xlsx
 *       - Sheet1: 测试结果汇总（逐用例）
 *       - Sheet2: 按模块统计
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const JSON_PATH = path.join(PROJECT_ROOT, 'test-reports', 'result.json')
const REPORTS_DIR = path.join(PROJECT_ROOT, 'test-reports')

// ===== 工具函数 =====

/** 生成时间戳文件名 */
function timestampName() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `测试报告_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.xlsx`
}

/** 状态映射 */
function statusLabel(status) {
  switch (status) {
    case 'passed': return '✅ PASS'
    case 'failed': return '❌ FAIL'
    case 'skipped': return '⏭ SKIP'
    default: return status
  }
}

/** 从测试 title 中提取模块名 */
function extractModule(title) {
  // title 格式如: "1. 页面加载与初始渲染 › 1.1 页面标题正确"
  const parts = title.split('›')
  if (parts.length >= 1) return parts[0].trim()
  return title.trim()
}

// ===== 读取 JSON 报告 =====

if (!fs.existsSync(JSON_PATH)) {
  console.error(`❌ JSON 报告不存在: ${JSON_PATH}`)
  console.error('   请先运行 npx playwright test 生成报告')
  process.exit(1)
}

const report = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
const suites = report.suites || []

// ===== 提取测试结果 =====

/** @type {Array<{module: string, title: string, status: string, duration: number}>} */
const testResults = []

function walkSuites(suiteList, parentModule = '') {
  for (const suite of suiteList) {
    const moduleName = suite.title || parentModule
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests || []) {
          // 预期状态 vs 实际状态
          const expected = spec.ok !== false
          const actual = test.status === 'expected' ? 'passed' : test.status
          const resultStatus = test.status === 'expected' ? 'passed' :
                              test.status === 'unexpected' ? 'failed' :
                              test.status === 'skipped' ? 'skipped' : test.status

          testResults.push({
            module: moduleName || extractModule(spec.title),
            title: spec.title,
            status: expected ? resultStatus : resultStatus === 'passed' ? 'failed' : resultStatus,
            duration: test.results?.[0]?.duration || test.duration || 0,
          })
        }
      }
    }
    if (suite.suites) walkSuites(suite.suites, moduleName)
  }
}

walkSuites(suites)

if (testResults.length === 0) {
  console.error('❌ JSON 报告中没有测试结果数据')
  process.exit(1)
}

// ===== 生成 Excel =====

// Sheet1: 测试结果汇总
const summaryHeaders = ['序号', '测试模块', '测试用例', '用例总数', '测试结果', '耗时(s)']
const summaryRows = [summaryHeaders]

testResults.forEach((r, i) => {
  summaryRows.push([
    i + 1,
    r.module,
    r.title,
    1,
    statusLabel(r.status),
    (r.duration / 1000).toFixed(2),
  ])
})

// Sheet2: 按模块统计
const moduleStats = {}
for (const r of testResults) {
  const mod = r.module
  if (!moduleStats[mod]) moduleStats[mod] = { total: 0, passed: 0, failed: 0, skipped: 0 }
  moduleStats[mod].total++
  if (r.status === 'passed' || r.status === 'expected') moduleStats[mod].passed++
  else if (r.status === 'failed' || r.status === 'unexpected') moduleStats[mod].failed++
  else moduleStats[mod].skipped++
}

const statsHeaders = ['模块', '用例数', '通过', '失败', '跳过', '通过率']
const statsRows = [statsHeaders]

let grandTotal = 0, grandPassed = 0, grandFailed = 0, grandSkipped = 0
for (const [mod, s] of Object.entries(moduleStats)) {
  grandTotal += s.total
  grandPassed += s.passed
  grandFailed += s.failed
  grandSkipped += s.skipped
  const rate = s.total > 0 ? ((s.passed / s.total) * 100).toFixed(1) + '%' : 'N/A'
  statsRows.push([mod, s.total, s.passed, s.failed, s.skipped, rate])
}

const grandRate = grandTotal > 0 ? ((grandPassed / grandTotal) * 100).toFixed(1) + '%' : 'N/A'
statsRows.push(['总计', grandTotal, grandPassed, grandFailed, grandSkipped, grandRate])

// ===== 写入 Excel =====

const wb = XLSX.utils.book_new()

// Sheet1
const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows)
summaryWs['!cols'] = [
  { wch: 6 },  // 序号
  { wch: 28 }, // 测试模块
  { wch: 48 }, // 测试用例
  { wch: 10 }, // 用例总数
  { wch: 12 }, // 测试结果
  { wch: 10 }, // 耗时
]
XLSX.utils.book_append_sheet(wb, summaryWs, '测试结果汇总')

// Sheet2
const statsWs = XLSX.utils.aoa_to_sheet(statsRows)
statsWs['!cols'] = [
  { wch: 28 }, // 模块
  { wch: 10 }, // 用例数
  { wch: 8 },  // 通过
  { wch: 8 },  // 失败
  { wch: 8 },  // 跳过
  { wch: 10 }, // 通过率
]
XLSX.utils.book_append_sheet(wb, statsWs, '按模块统计')

const fileName = timestampName()
const filePath = path.join(REPORTS_DIR, fileName)
XLSX.writeFile(wb, filePath)

console.log(`✅ Excel 报告已生成: test-reports/${fileName}`)
console.log(`   Sheet1: 测试结果汇总 (${testResults.length} 条)`)
console.log(`   Sheet2: 按模块统计 (${Object.keys(moduleStats).length} 个模块)`)
console.log(`   通过率: ${grandRate}`)

// 输出文件路径供后续使用
console.log(`__FILE__${filePath}`)
