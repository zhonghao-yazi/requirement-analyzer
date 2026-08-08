/**
 * 认证服务
 */
import { api, setToken } from './apiClient'

export async function login(username, password) {
  const result = await api.post('/api/auth/login', { username, password })
  setToken(result.token)
  return result
}

export async function register(username, email, password) {
  const result = await api.post('/api/auth/register', { username, email, password })
  setToken(result.token)
  return result
}

export async function getMe() {
  const result = await api.get('/api/auth/me')
  setToken(result.token)
  return result
}

export function logout() {
  setToken(null)
  window.location.href = '/login'
}
