/**
 * 项目服务
 */
import { api } from './apiClient'

export async function listProjects() {
  const result = await api.get('/api/projects')
  return result.data
}

export async function createProject(name, description) {
  const result = await api.post('/api/projects', { name, description })
  return result.data
}

export async function getProject(id) {
  const result = await api.get(`/api/projects/${id}`)
  return result.data
}

export async function updateProject(id, data) {
  const result = await api.put(`/api/projects/${id}`, data)
  return result.data
}

export async function deleteProject(id) {
  await api.delete(`/api/projects/${id}`)
}
