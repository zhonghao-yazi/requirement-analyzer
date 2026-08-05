"""分析接口路由"""

import os
from fastapi import APIRouter, UploadFile, File, HTTPException

from schemas.models import AnalyzeResponse, HealthResponse
from services.file_parser import parse_file
from services.ai_analyzer import analyze

router = APIRouter(prefix="/api", tags=["分析接口"])

# 文件大小限制：50MB（可通过环境变量 MAX_FILE_SIZE_MB 覆盖）
_MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_MB", "50")) * 1024 * 1024


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    return HealthResponse()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_file(file: UploadFile = File(...)):
    """
    上传需求文件 → 解析内容 → AI分析 → 返回结构化结果

    支持格式：TXT / MD / DOCX / PDF / XMind / 图片(PNG/JPG/GIF等)
    文件限制：最大 {max_mb}MB

    返回 JSON：
    {{
      "code": 0,
      "message": "success",
      "data": {{
        "summary": [...],
        "flowSteps": [...],
        "flowEdges": [...],
        "testCases": [...]
      }}
    }}
    """.format(max_mb=_MAX_FILE_SIZE_BYTES // (1024 * 1024))
    # --- 1. 分块读取 + 大小校验 ---
    try:
        file_bytes = b""
        chunk_size = 1024 * 1024  # 1MB 分块读取
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            file_bytes += chunk
            if len(file_bytes) > _MAX_FILE_SIZE_BYTES:
                max_mb = _MAX_FILE_SIZE_BYTES // (1024 * 1024)
                raise HTTPException(
                    status_code=413,
                    detail=f"文件大小超过限制（最大 {max_mb}MB）",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")

    if not file_bytes:
        raise HTTPException(status_code=400, detail="上传的文件为空")

    # --- 2. 解析文件，提取文本 ---
    try:
        content, file_type = parse_file(file_bytes, file.filename or "unknown")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析失败: {str(e)}")

    # --- 3. AI 分析 ---
    try:
        result = await analyze(content, file.filename or "unknown", file_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI分析失败: {str(e)}")

    # --- 4. 返回结果 ---
    return AnalyzeResponse(
        code=0,
        message=f"分析完成（来源: {file_type} 文件，{len(result.testCases)} 条用例）",
        data=result,
    )
