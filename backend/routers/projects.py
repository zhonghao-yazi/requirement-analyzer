"""项目路由 — CRUD"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from schemas.database import User, Project, TestCase
from schemas.api import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectListResponse, ProjectDetailResponse, MessageResponse,
)
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/projects", tags=["项目管理"])


@router.get("", response_model=ProjectListResponse)
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的所有项目"""
    projects = (
        db.query(Project)
        .filter(Project.owner_id == current_user.id)
        .order_by(Project.updated_at.desc())
        .all()
    )

    data = []
    for p in projects:
        tc_count = db.query(func.count(TestCase.id)).filter(
            TestCase.project_id == p.id
        ).scalar() or 0
        d = p.to_dict()
        d["testcase_count"] = tc_count
        data.append(ProjectResponse(**d))

    return ProjectListResponse(data=data)


@router.post("", response_model=ProjectDetailResponse, status_code=201)
def create_project(
    req: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建新项目"""
    project = Project(
        name=req.name,
        description=req.description,
        owner_id=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    d = project.to_dict()
    d["testcase_count"] = 0
    return ProjectDetailResponse(data=ProjectResponse(**d))


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取项目详情"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此项目")

    tc_count = db.query(func.count(TestCase.id)).filter(
        TestCase.project_id == project.id
    ).scalar() or 0
    d = project.to_dict()
    d["testcase_count"] = tc_count
    return ProjectDetailResponse(data=ProjectResponse(**d))


@router.put("/{project_id}", response_model=ProjectDetailResponse)
def update_project(
    project_id: int,
    req: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新项目"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此项目")

    if req.name is not None:
        project.name = req.name
    if req.description is not None:
        project.description = req.description

    db.commit()
    db.refresh(project)

    tc_count = db.query(func.count(TestCase.id)).filter(
        TestCase.project_id == project.id
    ).scalar() or 0
    d = project.to_dict()
    d["testcase_count"] = tc_count
    return ProjectDetailResponse(data=ProjectResponse(**d))


@router.delete("/{project_id}", response_model=MessageResponse)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除项目（级联删除关联的需求、用例等）"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此项目")

    db.delete(project)
    db.commit()
    return MessageResponse(message="项目已删除")
