"""SQLAlchemy ORM 模型 — 映射到 MySQL 数据库表"""

from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime,
    Enum, ForeignKey, JSON, UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship

from database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    """用户"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        Enum("admin", "manager", "engineer", "viewer", name="user_role"),
        default="engineer",
    )
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    owned_projects = relationship("Project", back_populates="owner", lazy="dynamic")
    test_cases = relationship("TestCase", back_populates="creator", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Project(Base):
    """项目"""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    owner = relationship("User", back_populates="owned_projects")
    requirements = relationship("Requirement", back_populates="project", lazy="dynamic", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="project", lazy="dynamic", cascade="all, delete-orphan")
    test_plans = relationship("TestPlan", back_populates="project", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "owner_id": self.owner_id,
            "owner_name": self.owner.username if self.owner else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Requirement(Base):
    """需求"""
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text)
    file_name = Column(String(255))
    file_type = Column(String(20))
    version = Column(Integer, default=1)
    analysis_result = Column(JSON)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    project = relationship("Project", back_populates="requirements")
    test_cases = relationship("TestCase", back_populates="requirement", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "title": self.title,
            "content": self.content,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "version": self.version,
            "analysis_result": self.analysis_result,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TestCase(Base):
    """测试用例"""
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="SET NULL"))
    category = Column(String(50), nullable=False)
    priority = Column(Enum("P0", "P1", "P2", "P3", name="case_priority"), default="P2")
    status = Column(Enum("draft", "reviewing", "approved", "deprecated", name="case_status"), default="draft")
    title = Column(String(500), nullable=False)
    preconditions = Column(Text)
    steps = Column(Text)
    expected = Column(Text)
    sort_order = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    project = relationship("Project", back_populates="test_cases")
    requirement = relationship("Requirement", back_populates="test_cases")
    creator = relationship("User", back_populates="test_cases")
    executions = relationship("Execution", back_populates="test_case", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "requirement_id": self.requirement_id,
            "category": self.category,
            "priority": self.priority,
            "status": self.status,
            "title": self.title,
            "preconditions": self.preconditions or "",
            "steps": self.steps or "",
            "expected": self.expected or "",
            "sort_order": self.sort_order,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TestPlan(Base):
    """测试计划"""
    __tablename__ = "test_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(Enum("draft", "active", "completed", "archived", name="plan_status"), default="draft")
    start_date = Column(Date)
    end_date = Column(Date)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    project = relationship("Project", back_populates="test_plans")
    plan_testcases = relationship("PlanTestCase", back_populates="plan", lazy="dynamic", cascade="all, delete-orphan")
    test_runs = relationship("TestRun", back_populates="plan", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PlanTestCase(Base):
    """计划-用例关联"""
    __tablename__ = "plan_testcases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("test_plans.id", ondelete="CASCADE"), nullable=False)
    testcase_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))

    __table_args__ = (UniqueConstraint("plan_id", "testcase_id", name="uk_plan_tc"),)

    plan = relationship("TestPlan", back_populates="plan_testcases")


class TestRun(Base):
    """测试执行轮次"""
    __tablename__ = "test_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("test_plans.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    status = Column(Enum("pending", "running", "completed", name="run_status"), default="pending")
    started_at = Column(DateTime)
    finished_at = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=_utcnow)

    plan = relationship("TestPlan", back_populates="test_runs")
    executions = relationship("Execution", back_populates="run", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "plan_id": self.plan_id,
            "name": self.name,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "created_by": self.created_by,
        }


class Execution(Base):
    """执行记录"""
    __tablename__ = "executions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    testcase_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    run_id = Column(Integer, ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum("untested", "passed", "failed", "blocked", "skipped", name="exec_status"), default="untested")
    actual_result = Column(Text)
    notes = Column(Text)
    executed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    executed_at = Column(DateTime)
    created_at = Column(DateTime, default=_utcnow)

    __table_args__ = (UniqueConstraint("testcase_id", "run_id", name="uk_exec"),)

    test_case = relationship("TestCase", back_populates="executions")
    run = relationship("TestRun", back_populates="executions")

    def to_dict(self):
        return {
            "id": self.id,
            "testcase_id": self.testcase_id,
            "run_id": self.run_id,
            "status": self.status,
            "actual_result": self.actual_result,
            "notes": self.notes,
            "executed_by": self.executed_by,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
        }


class Defect(Base):
    """缺陷"""
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    testcase_id = Column(Integer, ForeignKey("test_cases.id", ondelete="SET NULL"))
    execution_id = Column(Integer, ForeignKey("executions.id", ondelete="SET NULL"))
    title = Column(String(500), nullable=False)
    severity = Column(Enum("critical", "major", "minor", "trivial", name="defect_severity"), default="major")
    status = Column(Enum("open", "in_progress", "resolved", "closed", name="defect_status"), default="open")
    description = Column(Text)
    external_id = Column(String(100))
    external_url = Column(String(500))
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "testcase_id": self.testcase_id,
            "execution_id": self.execution_id,
            "title": self.title,
            "severity": self.severity,
            "status": self.status,
            "description": self.description,
            "external_id": self.external_id,
            "external_url": self.external_url,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
