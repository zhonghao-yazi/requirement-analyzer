/**
 * AI 分析服务接口
 *
 * 将文件上传到后端 Python 服务进行分析，返回结构化结果。
 * 后端地址可通过环境变量 VITE_API_BASE 配置。
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
// 请求超时时间（毫秒），可通过环境变量覆盖
const REQUEST_TIMEOUT_MS = parseInt(
  import.meta.env.VITE_REQUEST_TIMEOUT || '60000',
  10,
)

/**
 * 带超时的 fetch 封装
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请检查后端服务是否正常运行')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 上传文件到后端进行分析
 *
 * @param {File} file — 用户上传的文件对象
 * @returns {Promise<object>} 结构化的分析结果 { summary, flowSteps, flowEdges, testCases }
 */
export async function analyzeRequirement(file) {
  const formData = new FormData()
  formData.append('file', file)

  let response
  try {
    response = await fetchWithTimeout(`${API_BASE}/api/analyze`, {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    // 网络错误（连接拒绝、超时等）
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('无法连接到后端服务，请确认服务已启动')
    }
    throw err
  }

  if (!response.ok) {
    let detail = `请求失败 (${response.status})`
    try {
      const errorData = await response.json()
      detail = errorData.detail || errorData.message || detail
    } catch {
      // 后端返回非 JSON 错误响应（如 502 HTML 页面）
      detail = `服务器错误 (${response.status})`
    }
    throw new Error(detail)
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error('后端返回了无效的响应格式')
  }

  if (result.code !== 0) {
    throw new Error(result.message || '分析失败')
  }

  return result.data
}

/**
 * 健康检查
 */
export async function healthCheck() {
  const response = await fetch(`${API_BASE}/api/health`)
  return response.json()
}
