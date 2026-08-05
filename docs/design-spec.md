# 设计规范 — 需求分析测试用例生成平台

## 主题色板

```css
:root {
  --color-bg:              #faf8fc;   /* 页面背景 */
  --color-surface:         #ffffff;   /* 卡片/组件背景 */
  --color-primary:         #7e57c2;   /* 主色 - 按钮、强调 */
  --color-primary-light:   #b39ddb;   /* 浅主色 - hover、次要元素 */
  --color-primary-lighter: #e8e0f0;   /* 极浅主色 - 背景色块 */
  --color-primary-dark:    #5e35b1;   /* 深主色 - active、标题 */
  --color-text:            #2d2d2d;   /* 主文字 */
  --color-text-secondary:  #6b6b6b;   /* 辅助文字 */
  --color-text-light:      #9e9e9e;   /* 占位文字 */
  --color-border:          #e0d8f0;   /* 边框/分割线 */
  --color-success:         #66bb6a;   /* 成功/核心流程标签 */
  --color-warning:         #ffa726;   /* 警告/边界值标签 */
  --color-danger:          #ef5350;   /* 危险/安全性标签 */
  --color-info:            #42a5f5;   /* 信息/稳定性标签 */
  --radius-sm:             6px;
  --radius-md:             10px;
  --radius-lg:             16px;
  --shadow-sm:             0 1px 3px rgba(94, 53, 177, 0.08);
  --shadow-md:             0 4px 12px rgba(94, 53, 177, 0.10);
  --shadow-lg:             0 8px 24px rgba(94, 53, 177, 0.12);
}
```

## 字体

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
             'Microsoft YaHei', sans-serif;
```

- 标题：`18px / 24px / 32px`，粗体
- 正文：`14px / 16px`，常规
- 辅助：`12px`，常规/灰色

## 组件设计规范

### 按钮

| 类型 | 样式 |
|------|------|
| 主按钮 | 紫色背景 `#7e57c2`，白色文字，圆角 `8px`，hover 加深至 `#5e35b1` |
| 次按钮 | 紫色边框，白色背景，紫色文字 |
| 下载按钮 | 主按钮样式 + 下载图标 |

### 卡片

- 白色背景，圆角 `10px`，阴影 `shadow-sm`
- hover 时阴影升至 `shadow-md`
- 内边距 `20px`

### 上传区域

- 虚线边框 `2px dashed #b39ddb`
- 背景 `#faf8fc`
- 圆角 `16px`
- 拖拽悬停时边框变为实线 `#7e57c2`，背景变为 `#e8e0f0`

### 表格

- 表头：`#e8e0f0` 背景，`#5e35b1` 文字
- 单元格：白色背景，hover 时 `#faf8fc`
- 分类标签：彩色圆角徽章

### 流程图

- 节点：圆角矩形，紫色边框，白色背景
- 连线：`2px solid #b39ddb`，箭头
- 垂直或水平布局

## 间距体系

```
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px
--space-2xl: 48px
```

## 响应式断点

```
--breakpoint-sm: 640px   (移动端)
--breakpoint-md: 768px   (平板)
--breakpoint-lg: 1024px  (桌面)
--breakpoint-xl: 1280px  (大屏)
```

设计以桌面端（≥1024px）为主，平板可读。
