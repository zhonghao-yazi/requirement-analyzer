#!/bin/bash
cd /d/AI-test/requirement-analyzer
echo "========== 1. 先看页面长什么样 =========="
node node_modules/@playwright/test/cli.js test --headed --grep "1.1 页面标题正确"
echo ""
echo "========== 2. 上传文件 + 自动分析 + 展示结果 =========="
node node_modules/@playwright/test/cli.js test --headed --grep "3.4 分析完成后展示测试用例表格"
echo ""
echo "========== 3. 筛选分类 Tab =========="
node node_modules/@playwright/test/cli.js test --headed --grep "4.3 点击分类 Tab 可筛选"
echo ""
echo "========== 4. Excel 下载 =========="
node node_modules/@playwright/test/cli.js test --headed --grep "5.1 点击下载按钮触发下载"
