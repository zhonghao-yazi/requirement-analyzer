# 测试管理系统

[![CI](https://github.com/zhonghao-yazi/requirement-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/zhonghao-yazi/requirement-analyzer/actions/workflows/ci.yml)

基于 React + Vite + FastAPI + MySQL 的前后端分离测试管理系统。支持用户注册登录、多项目空间、上传需求文件 AI 分析生成测试用例、在线编辑/增删/筛选用例、Excel 导出，数据库持久化存储。

## 架构

```
┌──────────────────┐     ┌─────────────────┐     ┌──────────┐
│  前端 (React 19)   │────▶│  后端 (FastAPI)   │────▶│  MySQL   │
│   Port 5173       │     │   Port 8000      │     │  :3306   │
└──────────────────┘     └────────┬────────┘     └──────────┘
                                  │
                          ┌───────▼───────┐
                          │  Claude API   │
                          │  (或规则引擎)   │
                          └───────────────┘
```

## 快速启动

```bash
# 1. 确保 MySQL 运行中
# 2. 初始化数据库（首次）
mysql -u root -proot < backend/init_db.sql

# 3. 后端（端口 8000）
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# 4. 前端（端口 5173）
cd requirement-analyzer
npm install
npx vite --host 0.0.0.0
```

浏览器打开 http://localhost:5173 ，注册账号即可使用。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | MySQL 连接字符串 | `mysql+pymysql://root:root@localhost:3306/test_management` |
| `JWT_SECRET` | JWT 签名密钥 | `test-management-secret-key-dev-only` |
| `JWT_EXPIRE_HOURS` | JWT 过期时间 | `24` |
| `ANTHROPIC_API_KEY` | Claude API Key（不设则用规则引擎） | — |
| `ANTHROPIC_MODEL` | Claude 模型名 | `claude-sonnet-4-20250514` |
| `MAX_FILE_SIZE_MB` | 文件大小上限 | `20` |
| `VITE_API_BASE` | 前端 API 地址 | `http://localhost:8000` |

配置存放在项目根目录 `.env` 文件中。

## 数据库

9 张表：`users` / `projects` / `requirements` / `test_cases` / `test_plans` / `plan_testcases` / `test_runs` / `executions` / `defects`

连接方式：`mysql -u root -proot test_management`

## API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:--:|
| POST | `/api/auth/register` | 用户注册 | — |
| POST | `/api/auth/login` | 用户登录 | — |
| GET | `/api/auth/me` | 当前用户信息 | JWT |
| GET/POST | `/api/projects` | 项目列表/创建 | JWT |
| GET/PUT/DELETE | `/api/projects/:id` | 项目详情/编辑/删除 | JWT |
| POST | `/api/projects/:pid/analyze` | 上传文件 AI 分析 | JWT |
| GET/POST | `/api/projects/:pid/testcases` | 用例列表/新增 | JWT |
| GET/PUT/DELETE | `/api/testcases/:id` | 用例详情/编辑/删除 | JWT |
| PATCH | `/api/testcases/batch` | 批量操作 | JWT |
| GET | `/api/health` | 健康检查 | — |

## 测试

```bash
# API 验证（14 项）
cd backend && python verify_api.py

# 前端页面验证（7 项）
cd requirement-analyzer && node verify-frontend.mjs

# 构建验证
cd requirement-analyzer && npx vite build
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite 8 + react-router-dom |
| 后端框架 | FastAPI + Uvicorn |
| 数据库 | MySQL + SQLAlchemy ORM |
| 认证 | bcrypt + JWT (python-jose) |
| 样式 | CSS Modules |
| AI 分析 | Claude API / 规则引擎回退 |
| 文件解析 | mammoth · pdfjs-dist · jszip · PyPDF2 · Pillow |
| Excel | SheetJS (xlsx) |

## 项目文档

- [需求文档](docs/requirements.md)
- [技术规范](docs/tech-spec.md)
- [设计规范](docs/design-spec.md)
- [API 设计](docs/api-design.md)
- [功能路线图](docs/feature-roadmap.md)
- [测试用例文档](docs/test-cases.md)
- [CLAUDE.md](CLAUDE.md) — AI 协作开发指引
