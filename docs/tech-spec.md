# 技术规范 — 需求分析测试用例生成平台

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | React | ^18.x |
| 构建 | Vite | ^5.x |
| 样式 | CSS Modules | 原生支持 |
| Excel导出 | SheetJS (xlsx) | ^0.20.x |
| DOCX解析 | mammoth | ^1.x |
| PDF解析 | pdfjs-dist | ^4.x |
| XMind解析 | jszip | ^3.x (XMind 内部为 ZIP) |
| 图标 | Lucide React | ^0.x |

## 架构设计

```
┌─────────────────────────────────────────┐
│                 App.jsx                  │
│         (全局状态 + 布局编排)             │
├─────────────────────────────────────────┤
│  Header  │  UploadZone  │  AnalysisResult │
│          │              │  FlowChart       │
│          │              │  TestCaseTable   │
│          │              │  DownloadBar     │
├─────────────────────────────────────────┤
│         services/                        │
│  fileParser.js  │  aiService.js          │
│                 │  mockData.js           │
├─────────────────────────────────────────┤
│         utils/                           │
│  excelExport.js  │  constants.js          │
└─────────────────────────────────────────┘
```

## 数据流

```
用户上传文件
    ↓
fileParser.js 解析文件内容 → 提取文本
    ↓
aiService.js 调用分析（当前使用 mockData）
    ↓
返回结构化结果: { summary, flowSteps, flowEdges, testCases }
    ↓
各组件渲染展示
    ↓
excelExport.js 生成 .xlsx 下载
```

## 组件规范

- 每个组件独立文件夹：`ComponentName/ComponentName.jsx` + `ComponentName.module.css`
- Props 类型用 JSDoc 注释（后续可迁移 TypeScript）
- 无状态组件优先使用函数组件 + Hooks

## 文件解析策略

| 文件类型 | 解析库 | 方法 |
|---------|--------|------|
| .txt / .md | 原生 FileReader | readAsText |
| .docx | mammoth | extractRawText |
| .pdf | pdfjs-dist | getTextContent |
| .xmind | jszip | 解压 content.json，提取 topic 树 |
| .png / .jpg / .gif | 预留 OCR / 多模态 API | 图片暂存为 base64，传给 AI API 处理 |

## 状态管理

```
App State:
├── file: File | null           # 当前上传的文件
├── loading: boolean            # 分析中
├── error: string | null        # 错误信息
└── analysisResult: {
    summary: string[]           # 需求要点
    flowSteps: {id,label}[]     # 流程节点
    flowEdges: {from,to}[]      # 流程连线
    testCases: {                # 测试用例
      category: string
      id: number
      title: string
      preconditions: string
      steps: string
      expected: string
    }[]
  } | null
```
