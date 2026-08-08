@echo off
cd /d d:\AI-test\requirement-analyzer
npx playwright test --headed --grep "页面加载"
