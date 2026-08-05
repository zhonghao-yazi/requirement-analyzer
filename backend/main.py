"""需求分析测试用例生成平台 — 后端服务入口"""

import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.analyze import router as analyze_router

# 创建 FastAPI 应用
app = FastAPI(
    title="需求分析测试用例生成 API",
    description="上传需求文件，AI 自动分析并生成测试用例",
    version="1.0.0",
)

# CORS — 允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # Vite dev server
        "http://127.0.0.1:5173",    # CI headless browser / local
        "http://localhost:3000",
        "http://localhost:4173",    # Vite preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(analyze_router)


# ===== 启动入口 =====

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("UVICORN_RELOAD", "false").lower() == "true",
        log_level="info",
    )
