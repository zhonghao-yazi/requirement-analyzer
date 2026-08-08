/**
 * 测试用例服务
 */
import { api } from './apiClient'

export async function listTestCases(projectId, params = {}) {
  const query = new URLSearchParams(params).toString()
  const result = await api.get(`/api/projects/${projectId}/testcases${query ? '?' + query : ''}`)
  return { data: result.data, total: result.total }
}

export async function createTestCase(projectId, data) {
  const result = await api.post(`/api/projects/${projectId}/testcases`, data)
  return result.data
}

export async function getTestCase(id) {
  const result = await api.get(`/api/testcases/${id}`)
  return result.data
}

export async function updateTestCase(id, data) {
  const result = await api.put(`/api/testcases/${id}`, data)
  return result.data
}

export async function deleteTestCase(id) {
  await api.delete(`/api/testcases/${id}`)
}

export async function batchTestCases(ids, action, data = null) {
  await api.patch('/api/testcases/batch', { ids, action, data })
}

export async function analyzeFile(projectId, file) {
  const formData = new FormData()
  formData.append('file', file)
  const result = await api.upload(`/api/projects/${projectId}/analyze`, formData)
  return result.data
}
