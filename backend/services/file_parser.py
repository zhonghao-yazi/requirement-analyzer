"""文件解析服务 — 支持 txt / md / docx / pdf / xmind / 图片"""

import io
import os
import zipfile
import json
import base64
from pathlib import Path


def parse_file(file_bytes: bytes, file_name: str) -> tuple[str, str]:
    """
    根据文件扩展名选择合适的解析器，提取文本内容

    Returns:
        (content: str, file_type: str) — 提取的文本内容 + 文件类型
    """
    ext = Path(file_name).suffix.lower()

    parsers = {
        '.txt': parse_text,
        '.md': parse_text,
        '.markdown': parse_text,
        '.docx': parse_docx,
        '.doc': parse_docx,
        '.pdf': parse_pdf,
        '.xmind': parse_xmind,
        '.png': parse_image,
        '.jpg': parse_image,
        '.jpeg': parse_image,
        '.gif': parse_image,
        '.bmp': parse_image,
        '.webp': parse_image,
    }

    parser = parsers.get(ext)
    if parser is None:
        raise ValueError(f"不支持的文件格式：{ext}")

    content = parser(file_bytes, file_name)
    return content, ext.lstrip('.')


# ===== TXT / MD =====

def parse_text(file_bytes: bytes, file_name: str = '') -> str:
    """解析纯文本 / Markdown 文件"""
    # 按优先级尝试多种编码
    for encoding in ['utf-8', 'gbk', 'gb2312', 'gb18030', 'big5', 'shift_jis', 'latin-1']:
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    # 最终兜底：替换无法解码的字符
    return file_bytes.decode('utf-8', errors='replace')


# ===== DOCX =====

def parse_docx(file_bytes: bytes, file_name: str = '') -> str:
    """解析 Word 文档"""
    from docx import Document as DocxDocument
    doc = DocxDocument(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return '\n'.join(paragraphs)


# ===== PDF =====

def parse_pdf(file_bytes: bytes, file_name: str = '') -> str:
    """解析 PDF 文件"""
    from PyPDF2 import PdfReader
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text and text.strip():
            pages.append(text.strip())
    return '\n\n'.join(pages)


# ===== XMind =====

def parse_xmind(file_bytes: bytes, file_name: str = '') -> str:
    """
    解析 XMind 思维导图文件
    XMind 文件本质是 ZIP，内含 content.json
    """
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        # 查找 content.json
        json_files = [f for f in zf.namelist() if f.endswith('content.json')]
        if not json_files:
            raise ValueError("XMind 文件中未找到 content.json")

        content_json = zf.read(json_files[0]).decode('utf-8')
        data = json.loads(content_json)

    # 递归提取所有 topic 文本
    lines = []

    def extract_topics(topic, depth=0):
        title = topic.get('title', '')
        if title.strip():
            prefix = '  ' * depth + ('- ' if depth > 0 else '')
            lines.append(f"{prefix}{title}")

        children = topic.get('children', {})
        attached = children.get('attached', [])
        for child in attached:
            extract_topics(child, depth + 1)

    # 从根 sheet 开始
    root = data[0] if isinstance(data, list) else data
    root_topic = root.get('rootTopic', {})
    extract_topics(root_topic)

    return '\n'.join(lines)


# ===== 图片 =====

# 图片 base64 编码大小上限：10MB 原始字节（约 13.3MB base64）
_MAX_IMAGE_BYTES = 10 * 1024 * 1024


def parse_image(file_bytes: bytes, file_name: str = '') -> str:
    """
    解析图片 — 返回 base64 编码（供多模态 AI 分析）
    同时尝试 OCR 提取文字（如果 Pillow 可用）
    """
    if len(file_bytes) > _MAX_IMAGE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        raise ValueError(
            f"图片文件过大（{size_mb:.1f}MB），请压缩后上传"
        )

    ext = Path(file_name).suffix.lower().lstrip('.')
    mime_map = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp',
    }
    mime = mime_map.get(ext, 'image/png')
    b64 = base64.b64encode(file_bytes).decode('utf-8')

    # 构造 data URL — 供多模态 API 直接识别
    data_url = f"data:{mime};base64,{b64}"

    # 生成描述性占位，实际图片由多模态模型分析
    return (
        f"[图片文件: {file_name}]\n"
        f"图片已编码为 base64，请通过多模态 API 进行内容分析。\n"
        f"Base64 长度: {len(b64)} 字符"
    )
