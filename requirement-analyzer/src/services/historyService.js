/**
 * 分析历史记录服务
 *
 * 使用 localStorage 保存最近 N 次分析结果，
 * 支持恢复查看、删除单条、清空全部。
 */

const STORAGE_KEY = 'req_analyzer_history'
const MAX_ENTRIES = 10

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id — 唯一标识（时间戳）
 * @property {string} fileName — 原始文件名
 * @property {string} fileSize — 格式化的文件大小
 * @property {string} timestamp — ISO 时间字符串
 * @property {string} label — 人类可读的时间标签
 * @property {object} data — 完整的分析结果 { summary, flowSteps, flowEdges, testCases }
 */

/** 读取全部历史记录 */
export function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** 保存一条新记录，超过上限自动删除最旧的 */
export function saveHistory(fileName, fileSize, data) {
  if (!data || !data.testCases) return

  const history = getHistory()
  const now = new Date()

  const entry = {
    id: String(now.getTime()),
    fileName,
    fileSize,
    timestamp: now.toISOString(),
    label: formatTimeLabel(now),
    data: sanitize(data),
  }

  history.unshift(entry)

  // 超过上限删除最旧的
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // localStorage 满了，删除最旧的一条重试
    history.pop()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch {
      // 仍然失败则放弃
    }
  }
}

/** 按 id 删除单条记录 */
export function deleteHistory(id) {
  const history = getHistory().filter((e) => e.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  return history
}

/** 清空全部历史 */
export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY)
}

/** 读取单条记录 */
export function getHistoryEntry(id) {
  return getHistory().find((e) => e.id === id) || null
}

// ===== 内部工具 =====

function formatTimeLabel(date) {
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffHour < 48) return '昨天'

  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 清理数据，移除过大的字段（如流程图坐标可以重新计算） */
function sanitize(data) {
  return {
    summary: data.summary || [],
    flowSteps: data.flowSteps || [],
    flowEdges: data.flowEdges || [],
    testCases: (data.testCases || []).map((tc) => ({
      id: tc.id,
      category: tc.category,
      title: tc.title,
      preconditions: tc.preconditions || '',
      steps: tc.steps || '',
      expected: tc.expected || '',
    })),
  }
}
