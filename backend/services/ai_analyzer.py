"""AI 分析服务 — 支持 Claude API 和本地规则引擎回退"""

import json
import os
import re
from schemas.models import AnalysisResult, TestCase, FlowStep, FlowEdge
from utils.prompts import SYSTEM_PROMPT, build_user_prompt

# 默认 Claude 模型（可通过环境变量 ANTHROPIC_MODEL 覆盖）
_DEFAULT_MODEL = "claude-sonnet-4-20250514"


# ===== 主入口 =====

async def analyze(content: str, file_name: str, file_type: str) -> AnalysisResult:
    """
    分析需求内容，返回结构化结果

    优先使用 Claude API（如果设置了 ANTHROPIC_API_KEY），
    否则使用本地规则引擎生成模板化结果。
    """
    api_key = os.getenv('ANTHROPIC_API_KEY', '').strip()

    if api_key:
        return await _analyze_with_claude(api_key, content, file_name)
    else:
        return _analyze_with_rules(content, file_name, file_type)


# ===== Claude API 路径 =====

async def _analyze_with_claude(api_key: str, content: str, file_name: str) -> AnalysisResult:
    """使用 Claude API 分析"""
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=api_key)
    model = os.getenv('ANTHROPIC_MODEL', _DEFAULT_MODEL).strip()

    user_prompt = build_user_prompt(content, file_name)

    message = await client.messages.create(
        model=model,
        max_tokens=4096,
        temperature=0.3,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    # 提取 JSON
    response_text = message.content[0].text
    return _parse_ai_response(response_text)


def _parse_ai_response(text: str) -> AnalysisResult:
    """从 AI 返回的文本中提取 JSON 并解析为 AnalysisResult"""
    # 先尝试提取 ```json ... ``` 代码块
    json_block_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
    if json_block_match:
        json_str = json_block_match.group(1)
    else:
        # 回退：找到第一个 { 到最后一个 } 之间的内容
        start = text.find('{')
        end = text.rfind('}')
        if start == -1 or end == -1 or start >= end:
            raise ValueError("AI 返回内容中未找到有效 JSON")
        json_str = text[start:end + 1]

    data = json.loads(json_str)

    # 转换字段名（camelCase → snake_case，适配前端）
    test_cases = []
    for tc in data.get('testCases', data.get('test_cases', [])):
        test_cases.append(TestCase(
            id=tc.get('id', 0),
            category=tc.get('category', ''),
            title=tc.get('title', ''),
            preconditions=tc.get('preconditions', ''),
            steps=tc.get('steps', ''),
            expected=tc.get('expected', ''),
        ))

    flow_steps = [
        FlowStep(id=s.get('id', ''), label=s.get('label', ''))
        for s in data.get('flowSteps', data.get('flow_steps', []))
    ]
    flow_edges = [
        FlowEdge(source=e.get('from', ''), target=e.get('to', ''))
        for e in data.get('flowEdges', data.get('flow_edges', []))
    ]

    return AnalysisResult(
        summary=data.get('summary', []),
        flowSteps=flow_steps,
        flowEdges=flow_edges,
        testCases=test_cases,
    )


# ===== 规则引擎回退路径 =====

def _analyze_with_rules(content: str, file_name: str, file_type: str) -> AnalysisResult:
    """
    本地规则引擎 — 不依赖外部 API，基于内容特征生成分析结果

    这是 API Key 不可用时的回退方案。
    它会：
    1. 提取文档中的标题行作为需求要点
    2. 识别流程关键词构建流程节点
    3. 生成标准测试用例模板
    """
    lines = content.strip().split('\n')
    lines = [l.strip() for l in lines if l.strip()]

    # 1. 提取需求摘要
    summary = _extract_summary(lines)

    # 2. 构建流程
    keywords = _extract_keywords(content)
    flow_steps, flow_edges = _build_flow(keywords)

    # 3. 生成测试用例
    test_cases = _generate_test_cases(summary, keywords)

    return AnalysisResult(
        summary=summary,
        flowSteps=[FlowStep(id=s['id'], label=s['label']) for s in flow_steps],
        flowEdges=[FlowEdge(source=e['from'], target=e['to']) for e in flow_edges],
        testCases=[TestCase(**tc) for tc in test_cases],
    )


def _extract_summary(lines: list[str]) -> list[str]:
    """从文本中提取要点作为需求摘要"""
    summary = []

    for line in lines:
        # 匹配标题行 (# 开头)
        if line.startswith('#'):
            title = line.lstrip('#').strip()
            if title and len(title) > 2:
                summary.append(title)
        # 匹配编号列表
        elif re.match(r'^[\d]+[\.\、\)）]', line):
            text = re.sub(r'^[\d]+[\.\、\)）]\s*', '', line)
            if len(text) > 3:
                summary.append(text)
        # 匹配破折号/星号列表
        elif re.match(r'^[-\*•]', line):
            text = line.lstrip('-*• ').strip()
            if len(text) > 3:
                summary.append(text)

    # 不够则用前几行填充
    if len(summary) < 3:
        for line in lines[:8]:
            if line not in summary and len(line) > 5:
                summary.append(line)
            if len(summary) >= 5:
                break

    return summary[:10]


def _extract_keywords(content: str) -> dict:
    """从内容中识别关键业务术语"""
    keyword_patterns = {
        'login': ['登录', 'login', 'sign in', '账号', '密码', '验证码'],
        'register': ['注册', 'register', 'sign up'],
        'upload': ['上传', 'upload'],
        'download': ['下载', 'download', '导出', 'export'],
        'search': ['搜索', '查询', 'search', 'query'],
        'form': ['表单', '提交', 'form', 'submit'],
        'auth': ['权限', '认证', '授权', 'auth', 'token', 'jwt'],
        'payment': ['支付', '付款', 'payment', 'pay'],
        'notification': ['通知', '消息', 'notification', 'message'],
        'data': ['数据', 'data', '数据库', '存储'],
    }

    found = {}
    lower = content.lower()
    for category, patterns in keyword_patterns.items():
        for p in patterns:
            if p.lower() in lower:
                found[category] = True
                break

    return found


def _build_flow(keywords: dict) -> tuple[list[dict], list[dict]]:
    """基于关键词构建通用流程图"""
    steps = []
    edges = []

    # 通用流程模板
    step_id = 1

    if 'login' in keywords or 'register' in keywords or 'auth' in keywords:
        # 认证相关流程
        flow_def = [
            ('打开页面', 'open'),
            ('填写信息', 'input'),
            ('提交请求', 'submit'),
            ('后端校验', 'validate'),
            ('处理请求', 'process'),
            ('返回结果', 'result'),
            ('成功完成', 'success'),
            ('显示错误', 'error'),
        ]
        for label, _ in flow_def:
            steps.append({'id': str(step_id), 'label': label})
            step_id += 1

        # 连线
        for i in range(len(steps) - 1):
            if steps[i]['label'] != '返回结果':
                edges.append({'from': str(i + 1), 'to': str(i + 2)})
        # 校验 → 错误分支
        edges.append({'from': '4', 'to': '8'})
        edges.append({'from': '5', 'to': '6'})
        edges.append({'from': '6', 'to': '7'})
    else:
        # 通用流程
        generic = ['开始', '数据输入', '处理', '验证', '完成']
        for label in generic:
            steps.append({'id': str(step_id), 'label': label})
            step_id += 1
        for i in range(len(steps) - 1):
            edges.append({'from': str(i + 1), 'to': str(i + 2)})

    return steps, edges


def _generate_test_cases(summary: list[str], keywords: dict) -> list[dict]:
    """基于需求摘要生成测试用例模板"""
    cases = []
    case_id = 1

    summary_text = '、'.join(summary[:5]) if summary else '系统功能'

    # 核心流程
    core_cases = [
        {
            'id': case_id,
            'category': '核心流程',
            'title': f'正常流程：{summary_text[:30]}',
            'preconditions': '1. 系统运行正常\n2. 用户已准备必要数据',
            'steps': '1. 打开相关页面\n2. 输入正确的数据\n3. 提交操作',
            'expected': '1. 操作成功完成\n2. 页面显示正确结果\n3. 无错误提示',
        },
        {
            'id': case_id + 1,
            'category': '核心流程',
            'title': f'验证关键字段正确输入',
            'preconditions': '1. 有有效的测试数据',
            'steps': '1. 在输入框中输入符合规则的数据\n2. 提交',
            'expected': '1. 数据通过前端校验\n2. 数据正确保存/处理',
        },
    ]
    for c in core_cases:
        c['id'] = case_id
        cases.append(c)
        case_id += 1

    # 边界值
    boundary_cases = [
        {
            'id': case_id,
            'category': '边界值',
            'title': '输入框最小长度边界测试',
            'preconditions': '',
            'steps': '1. 输入最小允许长度的数据（如1个字符）\n2. 提交',
            'expected': '1. 系统正常接受，不报错',
        },
        {
            'id': case_id + 1,
            'category': '边界值',
            'title': '输入框最大长度边界测试',
            'preconditions': '',
            'steps': '1. 输入最大允许长度的数据\n2. 提交',
            'expected': '1. 数据完整保存\n2. 不超过长度限制时不截断',
        },
        {
            'id': case_id + 2,
            'category': '边界值',
            'title': '空值/null提交测试',
            'preconditions': '',
            'steps': '1. 必填字段留空\n2. 点击提交',
            'expected': '1. 页面提示必填项不可为空\n2. 请求不会发送到后端',
        },
    ]
    for i, c in enumerate(boundary_cases):
        c['id'] = case_id + i
    cases.extend(boundary_cases)
    case_id += len(boundary_cases)

    # 安全性
    security_cases = [
        {
            'id': case_id,
            'category': '安全性',
            'title': 'SQL注入防护测试',
            'preconditions': '',
            'steps': "1. 在输入框输入: ' OR '1'='1\n2. 提交请求",
            'expected': '1. 输入被正确转义处理\n2. 不执行注入SQL\n3. 返回正常错误提示',
        },
        {
            'id': case_id + 1,
            'category': '安全性',
            'title': 'XSS跨站脚本注入测试',
            'preconditions': '',
            'steps': '1. 在输入框输入: <script>alert("xss")</script>\n2. 提交后在页面查看显示',
            'expected': '1. 脚本标签被转义或过滤\n2. 页面不执行脚本\n3. 不弹出alert框',
        },
        {
            'id': case_id + 2,
            'category': '安全性',
            'title': '未授权访问测试',
            'preconditions': '',
            'steps': '1. 未登录状态下访问需要权限的URL\n2. 尝试直接调用API',
            'expected': '1. 重定向到登录页\n2. API返回401未授权',
        },
    ]
    for i, c in enumerate(security_cases):
        c['id'] = case_id + i
    cases.extend(security_cases)
    case_id += len(security_cases)

    # 稳定性
    stability_cases = [
        {
            'id': case_id,
            'category': '稳定性',
            'title': '网络异常时提交操作',
            'preconditions': '断网或网络极差',
            'steps': '1. 填写数据\n2. 断开网络\n3. 点击提交',
            'expected': '1. 系统提示网络连接失败\n2. 不出现白屏或崩溃\n3. 网络恢复后可重新操作',
        },
        {
            'id': case_id + 1,
            'category': '稳定性',
            'title': '并发请求测试',
            'preconditions': '',
            'steps': '1. 快速连续点击提交按钮5次',
            'expected': '1. 按钮在首次点击后置灰\n2. 只发送一次请求\n3. 不会重复创建数据',
        },
        {
            'id': case_id + 2,
            'category': '稳定性',
            'title': '大数据量处理测试',
            'preconditions': '准备大量测试数据（1000条+）',
            'steps': '1. 一次性提交超大数据量\n2. 观察系统响应',
            'expected': '1. 系统在合理时间内返回\n2. 不出现内存溢出\n3. 超时时有相应提示',
        },
    ]
    for i, c in enumerate(stability_cases):
        c['id'] = case_id + i
    cases.extend(stability_cases)

    return cases
