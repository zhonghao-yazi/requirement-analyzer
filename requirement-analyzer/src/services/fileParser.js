/**
 * 文件解析服务
 *
 * 根据文件类型提取文本内容，供 AI 分析使用。
 * 重度库（mammoth/pdfjs/jszip）采用动态 import，按需加载。
 *
 * 支持：
 *   .txt / .md     — 纯文本读取
 *   .docx          — mammoth 提取（动态加载）
 *   .pdf           — pdfjs-dist 提取（动态加载）
 *   .xmind         — jszip 解压（动态加载）
 *   图片            — 读取为 base64 data URL
 */

/**
 * 主解析入口
 *
 * @param {File} file — 用户上传的文件
 * @returns {Promise<{content: string, fileType: string}>}
 */
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const type = file.type

  switch (ext) {
    case 'txt':
    case 'md':
    case 'markdown':
      return { content: await parseText(file), fileType: ext }

    case 'docx':
    case 'doc':
      return { content: await parseDocx(file), fileType: ext }

    case 'pdf':
      return { content: await parsePdf(file), fileType: 'pdf' }

    case 'xmind':
      return { content: await parseXmind(file), fileType: 'xmind' }

    default:
      if (type.startsWith('image/')) {
        return { content: await parseImage(file), fileType: 'image' }
      }
      throw new Error(`不支持的文件格式: .${ext}`)
  }
}

/** 纯文本 */
function parseText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('文本文件读取失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

/** DOCX — 动态加载 mammoth */
async function parseDocx(file) {
  try {
    const mammoth = await import('mammoth')
    const buffer = await file.arrayBuffer()
    const result = await mammoth.default.extractRawText({ arrayBuffer: buffer })
    return result.value || ''
  } catch (err) {
    if (err.message?.includes('Failed to fetch')) {
      throw new Error('DOCX 解析模块加载失败，请检查网络连接')
    }
    throw new Error(`DOCX 文件解析失败: ${err.message || '未知错误'}`)
  }
}

/** PDF — 动态加载 pdfjs-dist */
async function parsePdf(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()

    const buffer = await file.arrayBuffer()
    const typedArray = new Uint8Array(buffer)

    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise
    const pages = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item) => item.str)
        .filter(Boolean)
        .join(' ')
      if (pageText) pages.push(pageText)
    }

    return pages.join('\n\n')
  } catch (err) {
    if (err.message?.includes('Failed to fetch')) {
      throw new Error('PDF 解析模块加载失败，请检查网络连接')
    }
    throw new Error(`PDF 文件解析失败: ${err.message || '未知错误'}`)
  }
}

/** XMind — 动态加载 jszip */
async function parseXmind(file) {
  try {
    const JSZip = (await import('jszip')).default
    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)

    const contentFile = zip.file('content.json')
    if (!contentFile) {
      throw new Error('无法解析 XMind 文件：未找到 content.json')
    }

    const raw = await contentFile.async('text')
    const json = JSON.parse(raw)

    const extractTopics = (topic, depth = 0) => {
      if (!topic) return ''
      const indent = '  '.repeat(depth)
      let text = `${indent}• ${topic.title || ''}\n`
      if (topic.notes?.plain?.content) {
        text += `${indent}  ${topic.notes.plain.content}\n`
      }
      if (topic.children?.attached) {
        for (const child of topic.children.attached) {
          text += extractTopics(child, depth + 1)
        }
      }
      return text
    }

    const rootTopic = json[0]?.rootTopic
    if (!rootTopic) throw new Error('XMind 文件内容为空')

    return extractTopics(rootTopic)
  } catch (err) {
    if (err.message?.includes('Failed to fetch')) {
      throw new Error('XMind 解析模块加载失败，请检查网络连接')
    }
    throw err  // 保留原始错误（如 content.json 未找到等）
  }
}

/** 图片 → base64 data URL */
function parseImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}
