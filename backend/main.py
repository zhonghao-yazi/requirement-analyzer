"""测试管理系统 — 后端服务入口"""

import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers.analyze import router as analyze_router
from routers.auth import router as auth_router
from routers.projects import router as projects_router
from routers.testcases import router as testcases_router

# 创建 FastAPI 应用
app = FastAPI(
    title="测试管理系统 API",
    description="需求分析、测试用例管理、测试计划与执行追踪",
    version="2.0.0",
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
app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(testcases_router)


# ===== 启动事件 =====

@app.on_event("startup")
def on_startup():
    """应用启动时初始化数据库表"""
    init_db()


# ===== 启动入口 =====

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("UVICORN_RELOAD", "false").lower() == "true",
        log_level="info",
    )
