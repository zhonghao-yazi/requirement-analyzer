# CLAUDE.md — 需求分析测试用例生成平台

## 项目概述

一个基于 React + Vite 的前后端分离 Web 应用，支持上传需求文件（图片/文档/Xmind），通过 AI 分析后自动生成测试用例表格，支持在线编辑、增删用例、Excel 下载，并带分析历史记录。

## 标准文件路径指引

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求文档 | [docs/requirements.md](docs/requirements.md) | 产品需求与功能清单 |
| 技术规范 | [docs/tech-spec.md](docs/tech-spec.md) | 技术选型、架构、依赖 |
| 设计规范 | [docs/design-spec.md](docs/design-spec.md) | UI 设计规范、色板、组件 |
| 执行计划 | [docs/execution-plan.md](docs/execution-plan.md) | 分步开发计划与里程碑 |
| API 设计 | [docs/api-design.md](docs/api-design.md) | AI 分析接口设计 |
| 功能路线图 | [docs/feature-roadmap.md](docs/feature-roadmap.md) | 待开发功能清单（48项，按P0-P4分级） |
| 测试用例文档 | [docs/test-cases.md](docs/test-cases.md) | 手动测试用例（127条，15个模块） |
| 开发日志 | [dev-logs/](dev-logs/) | 每日开发记录 |

## 已完成功能清单

### Phase 1 — 基线功能（20项）✅

| 编号 | 功能 | 说明 |
|------|------|------|
| F01 | 页面加载与品牌渲染 | Header + 淡紫色主题色板 |
| F02 | 文件上传（点击） | 8种格式：PNG/JPG/GIF/DOCX/PDF/MD/TXT/XMind |
| F03 | 文件上传（拖拽） | 拖拽高亮反馈 + 拖离恢复 |
| F04 | 前端格式校验 | 扩展名校验 + 20MB 上限 + 友好错误提示 |
| F05 | 后端格式校验 | 分块读取 + 20MB 上限 + HTTP 413 |
| F06 | 自动分析 | 上传即触发 loading 动画 + disabled 状态 |
| F07 | 需求摘要 | 卡片列表 + 对勾图标 + 计数徽章 |
| F08 | 核心流程图 | SVG 节点 + 贝塞尔曲线连线 + 箭头 marker |
| F09 | 测试用例表格 | 6列 × N行，hover 高亮 |
| F10 | 分类筛选 Tab | 全部/核心流程/边界值/安全性/稳定性 + 计数 |
| F11 | 分类徽章 | 4色（绿/橙/红/蓝） |
| F12 | Excel 下载 | .xlsx + loading 状态 + 按钮切换 |
| F13 | 复制表格 | TSV → 剪贴板 + 三重降级方案 |
| F14 | 清除重置 | 一键恢复初始状态 |
| F15 | 错误处理 | 格式错/过大/网络异常/后端错误 |
| F16 | 竞态条件防护 | requestSeqRef 序列号机制 |
| F17 | 请求超时 | AbortController 60s 超时 |
| F18 | ErrorBoundary | 组件崩溃兜底 + 刷新按钮 |
| F19 | 后端文件解析 | 7种编码 + DOCX/PDF/XMind/图片 |
| F20 | CORS + 健康检查 | 跨域配置 + /api/health |

### Phase 2 — 核心可用性（4项）✅

| 编号 | 功能 | 说明 |
|------|------|------|
| F21 | 单元格双击编辑 | 双击 → input/textarea → Enter保存/Esc取消 |
| F22 | 手动新增用例 | "+ 添加"按钮 → 弹窗表单（分类/标题/前置/步骤/预期） |
| F23 | 删除用例 | 行末删除按钮 → 确认弹窗 → 删除后序号自动重排 |
| F24 | 分析历史记录 | localStorage 保存最近10次，Header右侧面板查看/删除/恢复 |

## AI 协作工作说明

### 开发原则

1. **分步推进**：按照 [feature-roadmap.md](docs/feature-roadmap.md) 中的 P0→P1→P2→P3 顺序执行
2. **代码规范**：组件化开发，CSS Modules 样式隔离，命名遵循 BEM 语义
3. **增量安全**：不一次性大量修改，每个 Phase 独立可验证
4. **测试驱动**：每次改动后用 `node func-test.mjs` 验证全部 76 项
5. **日志同步**：每次开发会话结束后，更新当天的 dev-logs

### 项目结构

```
requirement-analyzer/          # 前端项目根目录（Vite + React）
├── src/
│   ├── components/
│   │   ├── Header/            # 品牌标题栏（含 children 插槽）
│   │   ├── UploadZone/        # 拖拽/点击上传区
│   │   ├── AnalysisResult/    # 需求摘要卡片列表
│   │   ├── FlowChart/         # SVG 流程图
│   │   ├── TestCaseTable/     # 测试用例表格（编辑/新增/删除）
│   │   ├── DownloadBar/       # 下载 Excel + 复制表格
│   │   ├── HistoryPanel/      # 分析历史记录下拉面板
│   │   └── ErrorBoundary/     # React 崩溃兜底组件
│   ├── services/
│   │   ├── aiService.js       # 后端 API 调用（fetch + 超时）
│   │   ├── fileParser.js      # 前端文件解析
│   │   ├── historyService.js  # localStorage 历史记录 CRUD
│   │   └── mockData.js        # 原始模拟数据（已废弃）
│   └── utils/
│       ├── excelExport.js     # Excel 导出
│       └── constants.js       # 文件类型配置
├── tests/
│   ├── app.spec.js            # Playwright E2E（42用例）
│   └── test-data/             # 测试用需求文件
├── scripts/
│   └── generate-excel-report.mjs  # JSON → Excel 报告生成
├── func-test.mjs              # 功能测试脚本（76项）
├── check-site.mjs             # 全页面快照检查
├── explore-flow.mjs           # 完整流程探索记录
├── capture-page.mjs           # 页面内容捕获
└── open-browser.mjs           # headed 浏览器调试

backend/                       # 后端项目（FastAPI + Python）
├── main.py                    # 入口 + CORS
├── routers/
│   └── analyze.py             # POST /api/analyze + GET /api/health
├── services/
│   ├── file_parser.py         # 文件解析（7种编码，4种格式）
│   └── ai_analyzer.py         # AI分析（Claude API / 规则引擎回退）
├── schemas/
│   └── models.py              # Pydantic 数据模型
└── utils/
    └── prompts.py             # AI Prompt 模板
```

### 开发流程

1. 查阅 [feature-roadmap.md](docs/feature-roadmap.md) 确定当前阶段
2. 查看当天 [dev-logs/](dev-logs/) 了解进度
3. 实现功能 → `npx vite build` 验证编译
4. `node func-test.mjs` 验证全部 76 项功能
5. 更新 CLAUDE.md 功能清单 + 开发日志

### 启动方式

```bash
# 后端（端口 8000）
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# 前端（端口 5173）
cd requirement-analyzer
npm install
npx vite --host 0.0.0.0
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | Claude API Key（不设则用规则引擎） | — |
| `ANTHROPIC_MODEL` | Claude 模型名 | `claude-sonnet-4-20250514` |
| `MAX_FILE_SIZE_MB` | 后端文件大小上限 | `20` |
| `VITE_API_BASE` | 前端 API 地址 | `http://localhost:8000` |
| `VITE_REQUEST_TIMEOUT` | 前端请求超时（ms） | `60000` |

### 主题色板

- 主色：`#7e57c2` | 浅色：`#b39ddb` | 更浅：`#e8e0f0` | 深色：`#5e35b1`
- 背景：`#faf8fc` | 卡片：`#ffffff` | 文字：`#2d2d2d`

## Skills

| Skill | 路径 | 说明 |
|-------|------|------|
| Playwright 测试 | [.claude/skills/playwright-test.md](.claude/skills/playwright-test.md) | 运行及维护 E2E 自动化测试（42 用例） |

## 测试

| 类型 | 文件 | 用例数 | 说明 |
|------|------|:-----:|------|
| 功能测试 | `func-test.mjs` | **76** | Playwright 全功能逐项验证，15 模块 |
| E2E 测试 | `tests/app.spec.js` | 42 | Playwright 标准测试套件 |
| 页面检查 | `check-site.mjs` | 25 | 全页面快照 + 功能检查 |
| 流程探索 | `explore-flow.mjs` | 16步 | 完整用户旅程记录 |
| 手动用例 | [docs/test-cases.md](docs/test-cases.md) | 127 | 15模块手动测试用例文档 |

### 运行测试

```bash
cd requirement-analyzer
node func-test.mjs          # 功能测试（76项，~60s）
npx playwright test         # E2E 测试套件（42用例）
node check-site.mjs         # 页面快照检查
```
