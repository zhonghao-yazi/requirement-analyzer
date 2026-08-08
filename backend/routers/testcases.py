"""测试用例路由 — CRUD + 筛选/搜索/批量"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import get_db
from schemas.database import User, Project, TestCase
from schemas.api import (
    TestCaseCreate, TestCaseUpdate, TestCaseResponse,
    TestCaseListResponse, TestCaseDetailResponse,
    BatchRequest, MessageResponse,
)
from services.auth_service import get_current_user

router = APIRouter(prefix="/api", tags=["测试用例"])


def _get_project_or_404(project_id: int, user: User, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="无权访问此项目")
    return project


# ===== 列表 =====

@router.get("/projects/{project_id}/testcases", response_model=TestCaseListResponse)
def list_testcases(
    project_id: int,
    category: str | None = Query(None, description="按分类筛选"),
    priority: str | None = Query(None, description="按优先级筛选"),
    status_filter: str | None = Query(None, alias="status", description="按状态筛选"),
    search: str | None = Query(None, description="关键字搜索（标题/步骤/预期）"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取项目下的测试用例列表，支持筛选和搜索"""
    _get_project_or_404(project_id, current_user, db)

    query = db.query(TestCase).filter(TestCase.project_id == project_id)

    if category:
        query = query.filter(TestCase.category == category)
    if priority:
        query = query.filter(TestCase.priority == priority)
    if status_filter:
        query = query.filter(TestCase.status == status_filter)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                TestCase.title.like(pattern),
                TestCase.steps.like(pattern),
                TestCase.expected.like(pattern),
            )
        )

    total = query.count()
    cases = query.order_by(TestCase.sort_order.asc(), TestCase.id.asc()).all()

    return TestCaseListResponse(
        data=[TestCaseResponse(**c.to_dict()) for c in cases],
        total=total,
    )


# ===== 创建 =====

@router.post("/projects/{project_id}/testcases", response_model=TestCaseDetailResponse, status_code=201)
def create_testcase(
    project_id: int,
    req: TestCaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """手动新增测试用例"""
    _get_project_or_404(project_id, current_user, db)

    max_order = db.query(func.max(TestCase.sort_order)).filter(
        TestCase.project_id == project_id
    ).scalar() or 0

    tc = TestCase(
        project_id=project_id,
        category=req.category,
        priority=req.priority,
        status="draft",
        title=req.title,
        preconditions=req.preconditions,
        steps=req.steps,
        expected=req.expected,
        sort_order=max_order + 1,
        created_by=current_user.id,
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)

    return TestCaseDetailResponse(data=TestCaseResponse(**tc.to_dict()))


# ===== 详情 =====

@router.get("/testcases/{case_id}", response_model=TestCaseDetailResponse)
def get_testcase(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取单条测试用例"""
    tc = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    _get_project_or_404(tc.project_id, current_user, db)
    return TestCaseDetailResponse(data=TestCaseResponse(**tc.to_dict()))


# ===== 更新 =====

@router.put("/testcases/{case_id}", response_model=TestCaseDetailResponse)
def update_testcase(
    case_id: int,
    req: TestCaseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """编辑测试用例"""
    tc = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    _get_project_or_404(tc.project_id, current_user, db)
    update_data = req.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tc, key, value)
    db.commit()
    db.refresh(tc)
    return TestCaseDetailResponse(data=TestCaseResponse(**tc.to_dict()))


# ===== 删除 =====

@router.delete("/testcases/{case_id}", response_model=MessageResponse)
def delete_testcase(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除测试用例"""
    tc = db.query(TestCase).filter(TestCase.id == case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    _get_project_or_404(tc.project_id, current_user, db)
    db.delete(tc)
    db.commit()
    return MessageResponse(message="测试用例已删除")


# ===== 批量操作 =====

@router.patch("/testcases/batch", response_model=MessageResponse)
def batch_operate(
    req: BatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """批量操作测试用例"""
    if not req.ids:
        raise HTTPException(status_code=400, detail="操作对象不能为空")
    cases = db.query(TestCase).filter(TestCase.id.in_(req.ids)).all()
    if len(cases) != len(req.ids):
        raise HTTPException(status_code=400, detail="部分测试用例不存在")
    project_ids = set(c.project_id for c in cases)
    if len(project_ids) > 1:
        raise HTTPException(status_code=400, detail="只能批量操作同一项目下的用例")
    _get_project_or_404(list(project_ids)[0], current_user, db)
    if req.action == "delete":
        for c in cases:
            db.delete(c)
        db.commit()
        return MessageResponse(message=f"已删除 {len(cases)} 条用例")
    elif req.action == "update" and req.data:
        for c in cases:
            for key, value in req.data.items():
                if hasattr(c, key):
                    setattr(c, key, value)
        db.commit()
        return MessageResponse(message=f"已更新 {len(cases)} 条用例")
    raise HTTPException(status_code=400, detail=f"不支持的操作: {req.action}")
