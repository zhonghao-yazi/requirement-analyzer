"""分析接口路由 — 上传需求文件 → AI分析 → 持久化到数据库"""

import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.models import AnalyzeResponse
from schemas.database import User, Project, Requirement, TestCase as TestCaseORM
from services.file_parser import parse_file
from services.ai_analyzer import analyze
from services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["分析接口"])

# 文件大小限制
_MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "20"))
_MAX_FILE_SIZE_BYTES = _MAX_FILE_SIZE_MB * 1024 * 1024


@router.get("/health")
async def health_check():
    """健康检查（无需认证）"""
    return {"status": "ok", "version": "2.0.0"}


@router.post("/projects/{project_id}/analyze", response_model=AnalyzeResponse)
async def analyze_file(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    上传需求文件 → 解析内容 → AI分析 → 保存到数据库

    支持格式：TXT / MD / DOCX / PDF / XMind / 图片(PNG/JPG/GIF等)
    文件限制：最大 {max_mb}MB
    """.format(max_mb=_MAX_FILE_SIZE_MB)
    # 验证项目权限
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此项目")

    # --- 1. 分块读取 + 大小校验 ---
    file_bytes = b""
    try:
        while True:
            chunk = await file.read(1024 * 1024)  # 1MB 分块
            if not chunk:
                break
            file_bytes += chunk
            if len(file_bytes) > _MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"文件大小超过限制（最大 {_MAX_FILE_SIZE_MB}MB）",
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")

    if not file_bytes:
        raise HTTPException(status_code=400, detail="上传的文件为空")

    # --- 2. 解析文件 ---
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

    # --- 4. 持久化到数据库 ---
    # 保存需求
    req = Requirement(
        project_id=project_id,
        title=file.filename or "需求文档",
        content=content[:10000],  # 截断过长内容
        file_name=file.filename,
        file_type=file_type,
        version=1,
        analysis_result={
            "summary": result.summary,
            "flowSteps": [{"id": s.id, "label": s.label} for s in result.flowSteps],
            "flowEdges": [{"from": e.source, "to": e.target} for e in result.flowEdges],
        },
        created_by=current_user.id,
    )
    db.add(req)
    db.flush()  # 获取 req.id

    # 保存测试用例
    for i, tc in enumerate(result.testCases):
        db_tc = TestCaseORM(
            project_id=project_id,
            requirement_id=req.id,
            category=tc.category,
            priority=getattr(tc, "priority", "P2"),
            status=getattr(tc, "status", "draft"),
            title=tc.title,
            preconditions=tc.preconditions,
            steps=tc.steps,
            expected=tc.expected,
            sort_order=i + 1,
            created_by=current_user.id,
        )
        db.add(db_tc)

    db.commit()

    return AnalyzeResponse(
        code=0,
        message=f"分析完成，已生成 {len(result.testCases)} 条测试用例",
        data=result,
    )
