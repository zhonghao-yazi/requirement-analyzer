# 需求分析测试用例生成平台

[![CI](https://github.com/zhonghao-yazi/requirement-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/zhonghao-yazi/requirement-analyzer/actions/workflows/ci.yml)

上传需求文件 → AI 自动分析 → 生成测试用例表格 → 在线编辑 → Excel 下载

## 快速启动

```bash
npm install
npx vite --host 0.0.0.0
```

> 需要配合后端服务运行：[../backend/](../backend/)（端口 8000）

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | 运行 Oxlint 代码检查 |

## 测试

```bash
# Playwright E2E（42 用例）
npx playwright test

# 功能测试（76 项）
node func-test.mjs
```

## 技术栈

React 19 · Vite 8 · CSS Modules · Playwright · SheetJS · PDF.js · Mammoth · Lucide Icons
