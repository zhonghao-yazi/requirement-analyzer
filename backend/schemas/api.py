"""API 请求/响应 Pydantic Schemas"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


# ===== 认证 =====

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50, description="用户名")
    email: str = Field(..., max_length=100, description="邮箱")
    password: str = Field(..., min_length=6, max_length=100, description="密码")


class LoginRequest(BaseModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str


class AuthResponse(BaseModel):
    code: int = 0
    message: str = "success"
    token: str
    user: UserResponse


# ===== 项目 =====

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="项目名")
    description: Optional[str] = Field(None, description="项目描述")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    owner_name: Optional[str] = None
    testcase_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ProjectListResponse(BaseModel):
    code: int = 0
    message: str = "success"
    data: list[ProjectResponse]


class ProjectDetailResponse(BaseModel):
    code: int = 0
    message: str = "success"
    data: ProjectResponse


# ===== 测试用例 =====

class TestCaseCreate(BaseModel):
    category: str = Field(..., description="分类")
    priority: str = Field("P2", description="优先级：P0/P1/P2/P3")
    title: str = Field(..., description="测试标题")
    preconditions: str = Field("", description="前置条件")
    steps: str = Field(..., description="测试步骤")
    expected: str = Field(..., description="预期结果")


class TestCaseUpdate(BaseModel):
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    title: Optional[str] = None
    preconditions: Optional[str] = None
    steps: Optional[str] = None
    expected: Optional[str] = None


class TestCaseResponse(BaseModel):
    id: int
    project_id: int
    requirement_id: Optional[int] = None
    category: str
    priority: str
    status: str
    title: str
    preconditions: str
    steps: str
    expected: str
    sort_order: int
    created_by: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TestCaseListResponse(BaseModel):
    code: int = 0
    message: str = "success"
    data: list[TestCaseResponse]
    total: int = 0


class TestCaseDetailResponse(BaseModel):
    code: int = 0
    message: str = "success"
    data: TestCaseResponse


class BatchRequest(BaseModel):
    ids: list[int] = Field(..., description="操作对象 ID 列表")
    action: str = Field(..., description="操作类型：delete | update")
    data: Optional[dict] = Field(None, description="更新时的数据")


# ===== 通用 =====

class MessageResponse(BaseModel):
    code: int = 0
    message: str = "success"
