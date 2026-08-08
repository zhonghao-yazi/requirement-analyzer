---
name: playwright-test
description: 运行并维护项目 Playwright E2E 自动化测试套件（21 个用例，覆盖认证、项目管理、文件分析、用例 CRUD、筛选下载 5 大模块）
triggers:
  - 用户说"跑测试" / "E2E" / "Playwright" / "自动化测试"
  - 修改了前端组件或后端 API 后
  - 用户要求验证功能是否正常
---

# Playwright E2E 自动化测试 Skill

## 执行流程

```
1. 检查前置条件
   ├── MySQL 是否运行
   ├── curl -s localhost:8000/api/health          # 后端
   └── curl -s -o /dev/null -w "%{http_code}" localhost:5173  # 前端

2. npx playwright test（全量跑）

3. 全部通过 → 输出统计，结束

4. 有失败 → 先排除偶发抖动：
   npx playwright test --last-failed --reporter=list
   ├── 这次通过了 → 偶发（timing/网络波动），记录一下即可
   └── 仍然失败 → 确认真 bug，进入步骤 5

5. 定位根因，分三层排查（由浅入深）：

   A. 读 test-results/*/error-context.md 的 Page snapshot
      → 看失败瞬间页面实际渲染了什么（按钮在不在、文本对不对）
      → 对照下方「错误签名 → 修复」表精准匹配

   B. 若签名表无匹配 → 跑分层验证排除基础设施问题：
      python verify_api.py          # API 层是否正常（14 项）
      node verify-frontend.mjs      # 前端页面是否正常（7 项）
      → 如果这两层也有失败，先修它们

   C. 若分层验证全通过 → 可能是新引入的 bug：
      读相关源代码理解逻辑 → 修复应用代码或测试脚本

6. 修复后验证：
   ├── 修的是应用代码 → npx playwright test --last-failed（确认 bug 被修复）
   ├── 修的是测试脚本 → npx playwright test --last-failed（确认脚本正确）
   └── 通过后 → 再跑一次全量，确保修复没有引入新问题

7. 若以上都无法定位 → npx playwright test --ui 逐步单步调试
```

## 概述

Playwright + Chromium headless 对「测试管理系统」全页面 E2E 测试，覆盖：

- 认证流程（登录/注册/登出/路由守卫/Token 持久化）
- 项目管理（创建/进入/返回/删除/级联删除）
- 文件上传与 AI 分析（需求分析 → 用例生成 → 数据库持久化）
- 测试用例 CRUD（新增/编辑/删除，服务端持久化）
- 分类筛选与下载（Tab 筛选、Excel 下载、表格复制）

## 项目文件

| 文件 | 说明 |
|------|------|
| [playwright.config.js](../requirement-analyzer/playwright.config.js) | 配置（串行、单 worker、3 路 reporter） |
| [tests/app.spec.js](../requirement-analyzer/tests/app.spec.js) | 21 个 E2E 测试用例 |
| [tests/test-data/test_sample.txt](../requirement-analyzer/tests/test-data/test_sample.txt) | 测试用需求文件 |

配置详情和测试数据内容直接从上述文件读取，不在此重复。

## 测试架构

```
tests/app.spec.js（21 个用例）
├── 1. Auth           (7 个) — 登录/注册/登出/路由守卫/错误提示/JS 异常
├── 2. Projects       (4 个) — 创建/进入/返回/删除
├── 3. Analyze        (3 个) — 上传分析/摘要展示/不支持格式
├── 4. TestCase CRUD  (3 个) — 新增/双击编辑/删除
└── 5. Filter & Download (4 个) — 分类筛选/Excel 下载/复制表格
```

## 前置条件 & 启动

```bash
# 后端（端口 8000）
cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000

# 前端（端口 5173）
cd requirement-analyzer && npx vite --host 0.0.0.0
```

需要 MySQL 运行且 `test_management` 库已初始化（`mysql -u root -proot < backend/init_db.sql`）。

## 关键设计模式

### 认证：全局注册 + beforeEach 登录

```javascript
// test.beforeAll 注册一次 e2e_tester（已存在则忽略错误）
// 每个 describe 的 beforeEach 调用 doLogin(page) 确保已认证

async function doLogin(page) {
  await page.goto('/login')
  await page.locator('input[type="text"]').fill(USER.username)
  await page.locator('input[type="password"]').fill(USER.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/projects', { timeout: 8000 })
}
```

### 项目：createAndEnter 一键进入分析页

```javascript
// 创建项目 → 等待 h3 出现 → 点击进入 → 等待 URL 跳转
// 关键：用 waitForSelector('h3') 而非固定 waitForTimeout，避免 API 慢导致 timeout
```

### 选择器优先级

```javascript
// ✅ 语义选择器
page.getByRole('button', { name: /下载 Excel/ })
page.getByText(/用户名或密码错误/)
page.locator('button[title="删除此用例"]')

// ⚠️ CSS Modules 子串匹配 — 仅在无更好选择器时使用
page.locator('[class*="dropzone"]')

// ❌ 硬编码 hashed class
```

### 等待模式

```javascript
await page.waitForSelector('table', { timeout: 30000 })    // 分析完成
await page.waitForURL('**/projects', { timeout: 8000 })     // 页面跳转
await page.waitForSelector('h3', { timeout: 10000 })        // 项目卡片出现
```

## 错误签名 → 修复

| 错误签名 | 根因 | 修复文件 | 具体操作 |
|----------|------|----------|----------|
| `waiting for getByText(/用户名或密码错误/)` | 后端 login 返回 401 被 apiClient 的 401 拦截器吃掉，显示"登录已过期" | `routers/auth.py` / `services/apiClient.js` | auth.py login 返回 `status_code=400`；apiClient 排除 `/api/auth/login` 的 401 跳转 |
| `waiting for button { hasText: '添加' }` | AnalysisPage 空状态时未渲染 TestCaseTable 组件 | `pages/AnalysisPage.jsx` | 空状态分支也渲染 TestCaseTable |
| `waiting for input[placeholder*="测试标题"]` | 添加按钮找到了但模态框未弹出 | `components/TestCaseTable/TestCaseTable.jsx` | 检查 showAddModal 状态和模态框渲染条件 |
| `Test timeout in createAndEnter` at `h3.click()` | 项目 API 返回慢，600ms 后 h3 还未渲染 | `tests/app.spec.js` | 改用 `waitForSelector('h3')` |
| 所有认证测试失败 | 后端离线 / MySQL 离线 / e2e_tester 不存在 | — | 检查服务状态，运行 `verify_api.py` |
| 上传分析失败 | AI API 不可用且规则引擎未回退 | `services/ai_analyzer.py` | 检查 `ANTHROPIC_API_KEY` 环境变量 |

## 调试命令速查

```bash
npx playwright test                          # 全量
npx playwright test --grep "Auth"            # 按模块
npx playwright test --last-failed            # 仅失败项
npx playwright test --headed                 # 可见浏览器
npx playwright test --ui                     # 交互调试
npx playwright show-report                   # HTML 报告

# 配套验证（E2E 失败时先跑这两项定位层级）
cd backend && python verify_api.py           # 14 项 API
cd requirement-analyzer && node verify-frontend.mjs  # 7 项 UI
```

## 新增测试用例

1. 在 `tests/app.spec.js` 对应 `test.describe` 块中添加 `test()`
2. 复用 `doLogin(page)` / `createAndEnter(page, prefix)` helper
3. 选择器优先级：`getByRole` > `getByText` > `[title]` > `[placeholder*]` > `[class*]`
4. `npx playwright test --grep "新测试名"` 验证通过后再跑全量

## 已知限制

- 拖拽上传用 `evaluate()` 模拟 DOM 事件，不一定覆盖 React 事件系统所有行为
- 后端 API 独立测试由 `verify_api.py`（14 项）覆盖，不在此 Skill 范围内
- 无前端单元/组件测试，无移动端响应式测试
- `config.webServer` 仅在 CI 环境自动启动，本地需手动启服务