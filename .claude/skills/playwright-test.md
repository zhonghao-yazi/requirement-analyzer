---
name: playwright-test
description: 运行并维护项目 Playwright E2E 自动化测试套件（42 个用例，覆盖上传、分析、表格、下载、错误处理等 10 大模块）
model: haiku
---

# Playwright E2E 自动化测试 Skill

## 执行流程

每次调用此 Skill 时，按以下步骤执行：

1. **检查前置条件** — 确认前端 `:5173` 和后端 `:8000` 服务在线
2. **运行全部测试** — `npx playwright test`（config 中已配好 html + list + json 三路 reporter）
3. **生成 Excel 报告** — `node scripts/generate-excel-report.mjs`，从 `test-reports/result.json` 读取结果，输出两个 Sheet：
   - **Sheet1 "测试结果汇总"**：逐用例明细（序号、模块、用例名、总数、结果、耗时）
   - **Sheet2 "按模块统计"**：模块级统计（用例数、通过、失败、跳过、通过率）
   - 文件名格式：`test-reports/测试报告_YYYY-MM-DD_HH-mm-ss.xlsx`
4. **向用户展示结果** — 在对话中输出模块级统计表

## 概述

本项目使用 Playwright 对「需求分析测试用例生成平台」进行全页面端到端自动化测试。
测试通过 Chromium headless 浏览器执行，模拟真实用户操作：

- 页面加载与渲染验证
- 文件上传（点击选择 + 拖拽）
- 需求分析流程（上传 → loading → 结果展示）
- 测试用例表格与分类筛选
- Excel 下载 / 表格复制
- 错误处理与边界情况
- 流程图 SVG 渲染

## 项目文件

| 文件 | 说明 |
|------|------|
| [playwright.config.js](../requirement-analyzer/playwright.config.js) | Playwright 配置（3 路 reporter：html + list + json） |
| [tests/app.spec.js](../requirement-analyzer/tests/app.spec.js) | 42 个 E2E 测试用例 |
| [tests/test-data/test_sample.txt](../requirement-analyzer/tests/test-data/test_sample.txt) | 测试用需求文件 |
| [scripts/generate-excel-report.mjs](../requirement-analyzer/scripts/generate-excel-report.mjs) | JSON → Excel 报告生成脚本 |
| [open-browser.mjs](../requirement-analyzer/open-browser.mjs) | 持久化 headed 浏览器脚本（手动调试用） |
| [test-reports/](../requirement-analyzer/test-reports/) | 测试报告输出目录（JSON + Excel） |

## 测试架构

```
tests/app.spec.js
├── 1. 页面加载与初始渲染 (6 个)
│   ├── 1.1 页面标题正确
│   ├── 1.2 Header 品牌区域
│   ├── 1.3 上传区域默认提示
│   ├── 1.4 格式标签
│   ├── 1.5 初始空状态
│   └── 1.6 结果区域初始隐藏
├── 2. 文件上传功能 (6 个)
│   ├── 2.1 点击上传
│   ├── 2.2 文件大小显示
│   ├── 2.3 清除按钮
│   ├── 2.4 重置上传区
│   ├── 2.5 拖拽上传
│   └── 2.6 拖拽高亮
├── 3. 分析流程 E2E (6 个)
│   ├── 3.1 loading 状态
│   ├── 3.2 需求摘要
│   ├── 3.3 核心流程图
│   ├── 3.4 测试用例表格
│   ├── 3.5 下载操作栏
│   └── 3.6 加载中隐藏结果
├── 4. 测试用例表格 (7 个)
│   ├── 4.1 多分类展示
│   ├── 4.2 默认"全部"Tab
│   ├── 4.3 分类筛选
│   ├── 4.4 切换分类
│   ├── 4.5 Tab 计数
│   ├── 4.6 行完整性
│   └── 4.7 分类徽章颜色
├── 5. Excel 下载 (3 个)
├── 6. 复制表格 (1 个)
├── 7. 错误处理与边界 (6 个)
├── 8. 页面交互 (3 个)
├── 9. FlowChart (3 个)
└── 10. 综合场景 (1 个)
```

## 前置条件

1. **前端服务**：`http://localhost:5173`（Vite dev server）
2. **后端服务**：`http://localhost:8000`（FastAPI）

### 启动服务

```bash
# 后端
cd backend
python main.py &

# 前端
cd requirement-analyzer
npx vite --host 0.0.0.0 &
```

## 执行测试

### 运行全部测试

```bash
cd requirement-analyzer
npx playwright test
```

### 运行指定模块

```bash
npx playwright test --grep "文件上传"
npx playwright test --grep "分析流程"
npx playwright test --grep "Excel 下载"
npx playwright test --grep "综合场景"
```

### headed 模式（可见浏览器）

```bash
npx playwright test --headed
```

### UI 模式（交互式调试）

```bash
npx playwright test --ui
```

### 查看 HTML 报告

```bash
npx playwright show-report
```

### 生成测试代码（录制）

```bash
npx playwright codegen http://localhost:5173
```

## 关键设计说明

### CSS Modules 兼容

项目使用 CSS Modules，类名为 `_className_hash` 格式。测试优先使用语义选择器：

```javascript
// ✅ 推荐：语义选择器
page.getByRole('heading', { name: '测试用例', exact: true })
page.getByRole('button', { name: /下载 Excel/ })
page.locator('th').filter({ hasText: '测试标题' })

// ⚠️ 可用但需注意：CSS Modules 类名包含原类名作为子串
page.locator('[class*="dropzone"]')
page.locator('[class*="nodeLabel"]')

// ❌ 避免：硬编码完整 CSS 类名
page.locator('._dropzone_abc123')
```

### 等待模式

```javascript
// 等待分析完成
async function waitForResults(page) {
  await page.locator('h2').first().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForFunction(() => {
    return !document.body.innerText.includes('正在解析文件，AI 分析需求内容...')
  }, { timeout: 30000 }).catch(() => {})
}
```

### 文件上传

```javascript
// 通过 input[type="file"] 上传（最可靠）
const fileInput = page.locator('input[type="file"]')
await fileInput.setInputFiles(testFile('test_sample.txt'))

// 拖拽上传
const dropzone = page.locator('[class*="dropzone"]')
await dropzone.evaluate((node) => {
  const file = new File(['内容...'], 'test.txt', { type: 'text/plain' })
  const dt = new DataTransfer()
  dt.items.add(file)
  node.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }))
})
```

## 测试数据

测试文件位置：`tests/test-data/test_sample.txt`

```markdown
# 密码重置功能需求
## 功能描述
用户忘记密码后可通过邮箱验证码重置密码。
## 详细需求
1. 用户在登录页点击"忘记密码"进入重置流程
2. 输入注册邮箱，系统发送6位数字验证码到邮箱
3. 验证码有效期5分钟，超时需重新获取
...
```

## 配置说明

```javascript
// playwright.config.js
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,       // 串行执行（避免状态干扰）
  retries: process.env.CI ? 2 : 0,
  workers: 1,                 // 单 worker
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-reports/result.json' }],
  ],
})
```

## 维护指南

### 新增测试用例

1. 在 `tests/app.spec.js` 中找到对应的 `test.describe` 块
2. 添加新的 `test()` 函数
3. 参考已有测试的选择器风格（优先语义选择器）
4. 运行 `npx playwright test --grep "新测试名"` 验证

### 调试失败的测试

```bash
# 只看失败的测试
npx playwright test --reporter=list 2>&1 | grep -A 30 "failed"

# UI 模式逐步调试
npx playwright test --ui

# 只运行失败项
npx playwright test --last-failed
```

### 添加页面变更后的选择器更新

1. 先查看截图：`playwright-report/` 目录中的失败截图
2. 用 semantic 选择器替换失效的 class 选择器
3. 如果新组件缺少明确的语义标记，考虑在源代码中添加 `aria-label` 或 `data-testid`

## 已知限制

- 拖拽上传测试使用 `evaluate()` 模拟 DOM 事件，可能无法完全覆盖 React 事件系统的所有行为
- `canvas` / SVG 内部元素交互待补充
- 尚未测试移动端响应式布局
- 不包含后端 API 的独立单元测试
