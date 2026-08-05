# API 设计 — 需求分析接口

## 概述

AI 分析接口用于将提取的需求文本发送给大模型进行分析，返回结构化的需求摘要、流程步骤和测试用例。

当前开发阶段使用 `mockData.js` 模拟返回，后续接入真实 API。

---

## 接口定义

### POST /api/analyze

**描述**：分析需求内容，返回结构化分析结果

**Request**

```json
{
  "content": "string (required) — 从文件提取的文本内容",
  "fileName": "string (required) — 原始文件名",
  "fileType": "string (required) — 文件类型: txt|md|docx|pdf|xmind|image"
}
```

**Response (200)**

```json
{
  "code": 0,
  "data": {
    "summary": [
      "用户登录功能：支持账号密码登录",
      "密码规则：至少8位，包含大小写字母和数字",
      "登录失败3次锁定账号30分钟"
    ],
    "flowSteps": [
      { "id": "1", "label": "打开登录页" },
      { "id": "2", "label": "输入账号密码" },
      { "id": "3", "label": "点击登录" },
      { "id": "4", "label": "校验账号密码" },
      { "id": "5", "label": "登录成功 → 跳转首页" },
      { "id": "6", "label": "登录失败 → 提示错误" }
    ],
    "flowEdges": [
      { "from": "1", "to": "2" },
      { "from": "2", "to": "3" },
      { "from": "3", "to": "4" },
      { "from": "4", "to": "5" },
      { "from": "4", "to": "6" }
    ],
    "testCases": [
      {
        "id": 1,
        "category": "核心流程",
        "title": "正确账号密码登录成功",
        "preconditions": "1. 已有注册账号\n2. 账号状态正常",
        "steps": "1. 打开登录页\n2. 输入正确账号和密码\n3. 点击登录按钮",
        "expected": "登录成功，跳转至首页，显示用户信息"
      }
    ]
  }
}
```

**Response (4xx/5xx)**

```json
{
  "code": -1,
  "message": "错误描述",
  "data": null
}
```

---

## testCases.categories 枚举

| 值 | 标签颜色 | 含义 |
|----|---------|------|
| `核心流程` | 绿色 `#66bb6a` | Happy Path，主流程验证 |
| `边界值` | 橙色 `#ffa726` | 输入边界、极限值测试 |
| `安全性` | 红色 `#ef5350` | 权限、注入、加密相关 |
| `稳定性` | 蓝色 `#42a5f5` | 并发、超时、异常恢复 |

---

## 后续扩展

- 支持多模态：图片通过 base64 传入，由视觉模型分析
- 流式返回：分析结果逐条返回，提升体验
- 用户反馈：对生成的用例点赞/踩，优化模型
