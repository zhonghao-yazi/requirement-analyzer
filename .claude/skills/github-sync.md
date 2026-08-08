---
name: github-sync
description: 一键推送本地代码变更到 GitHub（基于 GitHub API，绕过 git push 网络限制）
triggers:
  - "上传代码" / "推送代码" / "push" / "同步GitHub" / "github sync" / "/sync"
  - 用户想把本地改动同步到 GitHub 时
---

# GitHub Sync Skill

通过 GitHub Contents API 批量推送本地变更文件，解决 `git push` 被网络屏蔽的问题。

## 执行流程

```
1. 运行 python scripts/github_sync.py --dry-run   → 预览待推送文件
2. 确认无误后 python scripts/github_sync.py       → 实际推送
3. 可选：python scripts/github_sync.py --files a.js b.css  → 仅推送指定文件
```

## 实现细节

- **Token 来源**: 自动从 `.mcp.json` 读取 `mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN`
- **仓库信息**: 从 `git remote get-url origin` 自动解析 owner/repo
- **提交信息**: 使用最近一次 `git log -1 --format=%s` 的 commit message
- **文件变更**: 自动检测 `git diff --name-only HEAD` + `git ls-files --others --exclude-standard`
- **更新已有文件**: 先 GET 获取 SHA，再 PUT 更新
- **新增文件**: 直接 PUT（不需要 SHA）
- **跳过非文件**: 自动跳过目录等非文件条目

## 脚本位置

`scripts/github_sync.py` — 可独立运行，也可被 Skill 调用。

## 参数

| 参数 | 说明 |
|------|------|
| `--dry-run` | 仅预览，不实际推送 |
| `--files a b c` | 仅推送指定文件 |
| `--branch main` | 目标分支（默认 main） |

## 示例

```bash
# 预览
python scripts/github_sync.py --dry-run

# 全量推送
python scripts/github_sync.py

# 只推某几个文件
python scripts/github_sync.py --files requirement-analyzer/src/App.jsx backend/main.py
```
