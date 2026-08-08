# CLAUDE.md — 测试管理系统

## 项目概述

一个基于 React + Vite + FastAPI + MySQL 的前后端分离测试管理系统，支持用户注册登录、多项目空间、上传需求文件、AI 分析生成测试用例、在线编辑/增删用例、Excel 下载等功能。Phase 1 已完成数据库 + 认证 + RESTful API 基础设施。

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

### V1.0 — 需求分析工具（24项）✅

| 编号 | 功能 | 说明 |
|------|------|------|
| F01-F20 | 基线功能 | 文件上传/拖拽/格式校验、AI分析、流程图、用例表格、Excel下载、错误处理、竞态防护、ErrorBoundary |
| F21-F24 | 核心可用性 | 单元格双击编辑、手动新增用例、删除用例、localStorage 分析历史 |

### V2.0 — 测试管理系统 Phase 1（本次）✅

| 编号 | 功能 | 说明 |
|------|------|------|
| N01 | MySQL 数据库 | 9 张表（users/projects/requirements/test_cases/test_plans/plan_testcases/test_runs/executions/defects） |
| N02 | SQLAlchemy ORM | 完整模型定义 + relationship + to_dict |
| N03 | 用户注册/登录 | bcrypt 密码哈希 + JWT 认证（24h 过期） |
| N04 | 路由守卫 | ProtectedRoute + AuthContext 全局状态 |
| N05 | 项目管理 | 创建/列表/编辑/删除（含用例计数），级联删除 |
| N06 | 测试用例 CRUD | 新建/编辑/删除/批量操作，支持筛选（分类/优先级/状态）和关键字搜索 |
| N07 | 分析持久化 | 上传文件分析后自动存入 requirements + test_cases 表 |
| N08 | 前端多页面路由 | /login → /projects → /projects/:id，react-router-dom |
| N09 | 统一 API 客户端 | apiClient.js：自动附加 token、401 自动跳转登录、超时处理 |
| N10 | 验证脚本 | verify_api.py（14 项 API 验证）、verify-frontend.mjs（7 项 UI 验证） |

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
│   │   ├── TestCaseTable/     # 测试用例表格（编辑/新增/删除，支持服务端持久化）
│   │   ├── DownloadBar/       # 下载 Excel + 复制表格
│   │   ├── HistoryPanel/      # 分析历史记录下拉面板（将被服务端替代）
│   │   ├── ProtectedRoute/    # 路由守卫（未登录重定向）
│   │   └── ErrorBoundary/     # React 崩溃兜底组件
│   ├── pages/
│   │   ├── LoginPage/         # 登录/注册双表单页
│   │   ├── ProjectsPage/      # 项目列表 + 创建项目
│   │   └── AnalysisPage/      # 核心分析工作台（上传→分析→结果→编辑）
│   ├── contexts/
│   │   └── AuthContext.jsx    # 认证状态管理（user, token, login/logout）
│   ├── services/
│   │   ├── apiClient.js       # 通用 fetch 封装（自动附加 token + 401 处理）
│   │   ├── authService.js     # 登录/注册/获取用户
│   │   ├── projectService.js  # 项目 CRUD
│   │   ├── testcaseService.js # 测试用例 CRUD + 分析上传
│   │   ├── aiService.js       # 旧版 API 调用（保留兼容）
│   │   ├── fileParser.js      # 前端文件解析
│   │   └── historyService.js  # localStorage 历史记录（将被服务端替代）
│   └── utils/
│       ├── excelExport.js     # Excel 导出
│       └── constants.js       # 文件类型配置
├── tests/
│   ├── app.spec.js            # Playwright E2E（21用例）
│   └── test-data/             # 测试用需求文件
└── scripts/

backend/                       # 后端项目（FastAPI + Python + MySQL）
├── main.py                    # 入口 + CORS + 路由注册 + DB 初始化
├── config.py                  # 环境变量集中管理
├── database.py                # SQLAlchemy engine + session + Base
├── init_db.sql                # 数据库建表 DDL
├── routers/
│   ├── analyze.py             # POST /api/projects/:pid/analyze（含 DB 持久化）
│   ├── auth.py                # POST /api/auth/register, login, GET /me
│   ├── projects.py            # CRUD /api/projects
│   └── testcases.py           # CRUD /api/projects/:pid/testcases + batch
├── services/
│   ├── file_parser.py         # 文件解析（7种编码，8种格式）
│   ├── ai_analyzer.py         # AI分析（Claude API / 规则引擎回退）
│   └── auth_service.py        # bcrypt 密码哈希 + JWT 生成/验证
├── schemas/
│   ├── models.py              # Pydantic 数据模型
│   ├── database.py            # SQLAlchemy ORM 模型（8表）
│   └── api.py                 # 请求/响应 Pydantic Schema
└── utils/
    └── prompts.py             # AI Prompt 模板
```

### 开发流程

1. 查阅 [feature-roadmap.md](docs/feature-roadmap.md) 确定当前阶段
2. 查看当天 [dev-logs/](dev-logs/) 了解进度
3. 实现功能 → `npx vite build` 验证编译
4. `python verify_api.py` 验证全部 14 项 API
5. `node verify-frontend.mjs` 验证前端页面
6. 更新 CLAUDE.md 功能清单 + 开发日志

### 数据库

| 表 | 说明 |
|------|------|
| users | 用户（admin/manager/engineer/viewer） |
| projects | 项目 |
| requirements | 需求（含 AI 分析结果 JSON） |
| test_cases | 测试用例（分类/优先级/状态/内容） |
| test_plans | 测试计划 |
| plan_testcases | 计划-用例关联（含分配） |
| test_runs | 执行轮次 |
| executions | 用例执行记录 |
| defects | 缺陷（可关联外部 Jira/TAPD） |

连接：`mysql+pymysql://root:root@localhost:3306/test_management`（可通过 DATABASE_URL 环境变量覆盖）

### 启动方式

```bash
# MySQL（确保服务已启动）
mysqld

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
| `DATABASE_URL` | MySQL 连接字符串 | `mysql+pymysql://root:root@localhost:3306/test_management` |
| `JWT_SECRET` | JWT 签名密钥 | `test-management-secret-key-dev-only` |
| `JWT_EXPIRE_HOURS` | JWT 过期时间（小时） | `24` |
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
| Playwright 测试 | [.claude/skills/playwright-test.md](.claude/skills/playwright-test.md) | 运行及维护 E2E 自动化测试（21 用例，5 模块） |
| 浏览器演示 | [.claude/skills/browser-demo.md](.claude/skills/browser-demo.md) | 浏览器实时演示核心功能（项目浏览/筛选/添加/下载） |

## API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:--:|
| GET | `/api/health` | 健康检查 | — |
| POST | `/api/auth/register` | 用户注册 | — |
| POST | `/api/auth/login` | 用户登录 | — |
| GET | `/api/auth/me` | 获取当前用户 | JWT |
| GET | `/api/projects` | 项目列表 | JWT |
| POST | `/api/projects` | 创建项目 | JWT |
| GET | `/api/projects/:id` | 项目详情 | JWT |
| PUT | `/api/projects/:id` | 更新项目 | JWT |
| DELETE | `/api/projects/:id` | 删除项目（级联） | JWT |
| POST | `/api/projects/:pid/analyze` | 上传文件分析 + 入库 | JWT |
| GET | `/api/projects/:pid/testcases` | 用例列表（?category/priority/status/search） | JWT |
| POST | `/api/projects/:pid/testcases` | 手动新增用例 | JWT |
| GET | `/api/testcases/:id` | 用例详情 | JWT |
| PUT | `/api/testcases/:id` | 编辑用例 | JWT |
| DELETE | `/api/testcases/:id` | 删除用例 | JWT |
| PATCH | `/api/testcases/batch` | 批量操作（delete/update） | JWT |

## 测试

| 类型 | 文件 | 用例数 | 说明 |
|------|------|:-----:|------|
| API 验证 | `backend/verify_api.py` | **14** | 全 API 端点逐项验证 |
| 前端验证 | `verify-frontend.mjs` | **7** | Playwright headless 页面验证 |
| E2E 测试 | `tests/app.spec.js` | 21 | Playwright 标准测试套件（V2 已适配） |
| 手动用例 | [docs/test-cases.md](docs/test-cases.md) | 127 | 15模块手动测试用例文档 |

### 运行测试

```bash
# API 验证
cd backend && python verify_api.py

# 前端页面验证
cd requirement-analyzer && node verify-frontend.mjs

# E2E 测试套件
cd requirement-analyzer && npx playwright test

# 构建验证
cd requirement-analyzer && npx vite build
```
