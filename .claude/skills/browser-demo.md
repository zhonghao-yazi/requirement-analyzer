---
name: browser-demo
description: 在浏览器中实时演示测试管理系统核心功能（项目浏览、用例筛选、手动添加、Excel下载、复制表格），使用 Playwright MCP 有头浏览器操作
triggers:
  - 用户说"浏览器演示" / "演示" / "/demo" / "跑一遍页面"
  - 用户想看系统实际运行效果
  - 给他人展示项目功能时
---

# 浏览器实时演示 Skill

## 执行流程

```
1. 检查前置条件
   ├── 后端：curl -s localhost:8000/api/health
   └── 前端：curl -s -o /dev/null -w "%{http_code}" localhost:5173
   └── 未启动则自动启动（uvicorn / vite）

2. Playwright MCP 浏览器操作
   ├── navigate → localhost:5173
   ├── 如果跳转到 /login → 用 e2e_tester / e2e123456 登录
   ├── 到达 /projects 项目列表 → 截图
   ├── 找一个有 ≥5 条用例的项目（优先最新），点击 h3 进入
   ├── 到达分析页 → 截图（上传区 + 用例表格 + 筛选Tab）
   ├── 点击分类 Tab（如"核心流程"）筛选 → 截图
   ├── 切回「全部」
   ├── 点击「添加」→ 填写标题「Demo_手动添加_{时间戳}」→ 确认
   ├── 翻到最后一页确认新用例可见 → 截图
   ├── 点击「下载 Excel」→ 等待下载完成
   ├── 点击「复制表格」→ 确认显示「已复制」
   ├── 点击「返回项目列表」
   └── 回到 /projects → 截图

3. 输出摘要
   └── 汇总每一步结果，列出截图文件名
```

## 使用的 MCP 工具

全部通过 Playwright MCP（`mcp__playwright__*`）操作有头浏览器：

| 工具 | 用途 |
|------|------|
| `browser_navigate` | 导航到页面 |
| `browser_snapshot` | 获取页面可访问性树（比截图更省 token） |
| `browser_take_screenshot` | 截图保存（PNG，全页或视口） |
| `browser_click` | 点击元素（用 ref） |
| `browser_run_code_unsafe` | 执行 Playwright 代码（复杂交互：fill + click + waitFor） |
| `browser_type` | 文本输入 |
| `browser_wait_for` | 等待文本/时间 |

## 关键实现细节

### 1. 避免 ref 过期

快照的 `[ref=xxx]` 在 DOM 更新后会失效。复杂交互（填表、翻页、等待下载）用 `browser_run_code_unsafe` 一次性执行 Playwright 原生代码，避免 ref 问题：

```js
async (page) => {
  await page.locator('button', { hasText: '添加' }).click();
  await page.waitForTimeout(400);
  await page.locator('input[placeholder*="测试标题"]').fill('Demo用例');
  await page.locator('button', { hasText: '添加用例' }).click();
  await page.waitForTimeout(800);
  return 'done';
}
```

### 2. 下载文件

```js
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }),
  page.locator('button', { hasText: /下载 Excel/ }).click(),
]);
await download.saveAs('d:/AI-test/' + download.suggestedFilename());
```

### 3. 筛选 Tab

```js
await page.getByRole('button', { name: /核心流程/ }).click();
await page.waitForTimeout(300);
```

### 4. 翻页

```js
// 用 last() 避免与 category tab 中的数字按钮冲突
await page.locator('button').filter({ hasText: /^2$/ }).last().click();
```

### 5. 登录（如果需要）

```js
await page.locator('input[type="text"]').fill('e2e_tester');
await page.locator('input[type="password"]').fill('e2e123456');
await page.locator('button[type="submit"]').click();
await page.waitForURL('**/projects', { timeout: 8000 });
```

## 截图命名

所有截图统一存放在 `demo-screenshots/` 目录（已在 `.gitignore` 中排除）。

```
demo-screenshots/
├── demo-1-projects.png     # 项目列表
├── demo-2-analysis.png     # 分析页全貌
├── demo-3-filtered.png     # 筛选后
├── demo-4-added-case.png   # 手动添加确认
└── demo-5-back.png         # 返回项目列表
```

## 测试账号

| 字段 | 值 |
|------|-----|
| 用户名 | `e2e_tester` |
| 密码 | `e2e123456` |

## 注意事项

- 每次演示会创建一个新用例（`Demo_手动添加_xxx`），不影响已有数据
- 如果 Playwright MCP 未连接，提示用户在 MCP 面板点击重连
- 首次运行可能较慢（登录 + 等待网络），后续操作几秒内完成
- 浏览器是 headed 模式（可见），用户可以实时看到操作过程
