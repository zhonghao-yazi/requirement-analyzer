/**
 * 支持的文件类型配置
 * 每个类型包含：扩展名列表、显示标签、接受 MIME 类型
 */

export const FILE_TYPES = [
  {
    category: '图片',
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'],
    mime: 'image/*',
    color: '#42a5f5',
  },
  {
    category: '文档',
    extensions: ['.docx', '.doc'],
    mime: '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword',
    color: '#66bb6a',
  },
  {
    category: 'PDF',
    extensions: ['.pdf'],
    mime: '.pdf,application/pdf',
    color: '#ef5350',
  },
  {
    category: 'Markdown',
    extensions: ['.md', '.markdown'],
    mime: '.md,.markdown,text/markdown',
    color: '#7e57c2',
  },
  {
    category: '文本',
    extensions: ['.txt'],
    mime: '.txt,text/plain',
    color: '#ffa726',
  },
  {
    category: 'XMind',
    extensions: ['.xmind'],
    mime: '.xmind',
    color: '#ec407a',
  },
]

/** 所有支持的扩展名列表 */
export const ALL_EXTENSIONS = FILE_TYPES.flatMap((t) => t.extensions)
