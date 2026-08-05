# 需求分析测试用例生成平台

[![CI](https://github.com/zhonghao-yazi/requirement-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/zhonghao-yazi/requirement-analyzer/actions/workflows/ci.yml)

一个基于 React + Vite 的前后端分离 Web 应用，支持上传需求文件（图片/文档/Xmind），通过 AI 自动分析后生成测试用例表格，支持在线编辑、增删用例、Excel 下载，并带分析历史记录。

## 架构

```
┌──────────────────┐     ┌─────────────────┐
│  前端 (Vite+React) │────▶│  后端 (FastAPI)   │
│   Port 5173       │     │   Port 8000      │
└──────────────────┘     └────────┬────────┘
                                  │
                          ┌───────▼───────┐
                          │  Claude API   │
                          │  (或规则引擎)   │
                          └───────────────┘
```

## 快速启动

```bash
# 后端（端口 8000）
cd backend
pip install -r requirements.txt
python main.py

# 前端（端口 5173）
cd requirement-analyzer
npm install
npx vite --host 0.0.0.0
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | Claude API Key（不设则用规则引擎） | — |
| `ANTHROPIC_MODEL` | Claude 模型名 | `claude-sonnet-4-20250514` |
| `MAX_FILE_SIZE_MB` | 后端文件大小上限 | `20` |
| `VITE_API_BASE` | 前端 API 地址 | `http://localhost:8000` |
| `VITE_REQUEST_TIMEOUT` | 前端请求超时（ms） | `60000` |

参考 `.env.example` 文件复制为 `.env` 进行本地配置。

## 测试

```bash
cd requirement-analyzer

# Playwright E2E（42 用例）
npx playwright test

# 功能测试（76 项）
node func-test.mjs
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite 8 |
| 后端框架 | FastAPI + Uvicorn |
| 样式 | CSS Modules |
| AI 分析 | Claude API / 规则引擎回退 |
| 文件解析 | mammoth (DOCX) · pdfjs-dist (PDF) · jszip (XMind) · Pillow (图片) |
| Excel | SheetJS (xlsx) |
| E2E 测试 | Playwright |

## 项目文档

- [需求文档](docs/requirements.md)
- [技术规范](docs/tech-spec.md)
- [设计规范](docs/design-spec.md)
- [功能路线图](docs/feature-roadmap.md)
- [测试用例文档](docs/test-cases.md)
