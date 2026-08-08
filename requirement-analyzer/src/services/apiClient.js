/**
 * API 客户端 — 自动附加 Authorization header + 统一错误处理
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const REQUEST_TIMEOUT_MS = parseInt(
  import.meta.env.VITE_REQUEST_TIMEOUT || '60000',
  10,
)

function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
}

async function request(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const token = getToken()
  const headers = { ...options.headers }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    if (response.status === 401 && !url.includes('/api/auth/login')) {
      setToken(null)
      window.location.href = '/login'
      throw new Error('登录已过期，请重新登录')
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || data.message || `请求失败 (${response.status})`)
    }

    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请检查后端服务')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) =>
    request(url, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify(body),
    }),
  put: (url, body, options = {}) =>
    request(url, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify(body),
    }),
  patch: (url, body, options = {}) =>
    request(url, {
      ...options,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify(body),
    }),
  delete: (url, options = {}) => request(url, { ...options, method: 'DELETE' }),
  upload: (url, formData, options = {}) =>
    request(url, { ...options, method: 'POST', body: formData }),
}
