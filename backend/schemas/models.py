"""Pydantic 请求/响应数据模型"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


# ===== 测试用例 =====

class TestCase(BaseModel):
    """单条测试用例"""
    id: int = Field(..., description="序号")
    category: str = Field(..., description="分类：核心流程 | 边界值 | 安全性 | 稳定性")
    title: str = Field(..., description="测试标题")
    preconditions: str = Field("", description="前置条件")
    steps: str = Field(..., description="测试步骤")
    expected: str = Field(..., description="预期结果")


# ===== 流程节点/边 =====

class FlowStep(BaseModel):
    """流程节点"""
    id: str = Field(..., description="节点ID")
    label: str = Field(..., description="节点标签")


class FlowEdge(BaseModel):
    """流程连线 — 输出 JSON 使用 from/to 键"""
    model_config = ConfigDict(populate_by_name=True)

    source: str = Field(..., alias="from")
    target: str = Field(..., alias="to")


# ===== 分析结果 =====

class AnalysisResult(BaseModel):
    """完整的分析结果"""
    summary: list[str] = Field(..., description="需求要点列表")
    flowSteps: list[FlowStep] = Field(..., description="流程步骤节点")
    flowEdges: list[FlowEdge] = Field(..., description="流程连线")
    testCases: list[TestCase] = Field(..., description="测试用例列表")


# ===== API 响应 =====

class AnalyzeResponse(BaseModel):
    """标准 API 响应"""
    code: int = Field(0, description="状态码：0=成功，-1=失败")
    message: str = Field("success", description="提示信息")
    data: Optional[AnalysisResult] = Field(None, description="分析结果")


# ===== 健康检查 =====

class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str = "ok"
    version: str = "1.0.0"
