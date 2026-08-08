"""AI分析服务 — Claude API / 规则引擎回退"""
import json
import re
from anthropic import Anthropic
from config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from utils.prompts import ANALYSIS_PROMPT

# 初始化 Anthropic 客户端（如未配置 API Key 则为 None）
_client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


def analyze(content: str, file_name: str = "") -> dict:
    """分析需求内容，返回摘要 + 测试用例列表"""
    if _client:
        try:
            return _call_claude_api(content, file_name)
        except Exception as e:
            # Claude API 失败 → 回退到规则引擎
            return _rule_based_analysis(content, file_name)
    else:
        return _rule_based_analysis(content, file_name)


def _call_claude_api(content: str, file_name: str) -> dict:
    """调用 Claude API 分析"""
    prompt = ANALYSIS_PROMPT.format(content=content[:8000], file_name=file_name)
    
    response = _client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    
    text = response.content[0].text
    # 尝试从响应中提取 JSON
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        result = json.loads(json_match.group())
        return _normalize_result(result)
    
    # 无法解析 JSON → 回退
    return _rule_based_analysis(content, file_name)


def _rule_based_analysis(content: str, file_name: str = "") -> dict:
    """规则引擎分析回退"""
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    
    summary = {
        "title": file_name or "未命名需求",
        "total_points": len(lines),
        "core_flows": min(2, len(lines)),
        "boundary_cases": min(3, len(lines)),
        "security_cases": min(3, len(lines)),
        "stability_cases": min(3, len(lines)),
    }
    
    test_cases = []
    categories = ["核心流程", "核心流程", "边界值", "边界值", "边界值", "安全性", "安全性", "安全性", "稳定性", "稳定性", "稳定性"]
    
    for i, line in enumerate(lines[:11]):
        cat = categories[i] if i < len(categories) else "核心流程"
        tc = {
            "category": cat,
            "priority": "P2",
            "title": line[:80] if len(line) > 80 else line,
            "preconditions": "1. 系统运行正常 2. 用户已准备必要数据" if i == 0 else "—",
            "steps": "1. 打开相关页面 2. 输入正确的数据 3. 提交操作",
            "expected": "1. 操作成功完成 2. 页面显示正确结果 3. 无错误提示",
        }
        test_cases.append(tc)
    
    return {"summary": summary, "test_cases": test_cases}


def _normalize_result(result: dict) -> dict:
    """标准化 AI 返回的结果格式"""
    summary = result.get("summary", {})
    test_cases = result.get("test_cases", [])
    
    for tc in test_cases:
        tc.setdefault("category", "核心流程")
        tc.setdefault("priority", "P2")
        tc.setdefault("preconditions", "—")
        tc.setdefault("steps", "")
        tc.setdefault("expected", "")
    
    return {"summary": summary, "test_cases": test_cases}
