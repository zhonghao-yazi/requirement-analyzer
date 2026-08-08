import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { ClipboardList, Filter, Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { updateTestCase, createTestCase, deleteTestCase } from '../../services/testcaseService'
import styles from './TestCaseTable.module.css'

/** 分类配置 */
const CATEGORIES = [
  { key: '全部', label: '全部', color: '#7e57c2' },
  { key: '核心流程', label: '核心流程', color: '#66bb6a' },
  { key: '边界值', label: '边界值', color: '#ffa726' },
  { key: '安全性', label: '安全性', color: '#ef5350' },
  { key: '稳定性', label: '稳定性', color: '#42a5f5' },
]

const EDITABLE_COLS = ['title', 'preconditions', 'steps', 'expected']
const PAGE_SIZE_OPTIONS = [10, 20, 50]

export default function TestCaseTable({ testCases, onChange, projectId }) {
  const [activeCategory, setActiveCategory] = useState('全部')
  // ---- F21: 单元格编辑状态 ----
  const [editingCell, setEditingCell] = useState(null) // { id, field }
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef(null)
  // ---- F22: 新增用例弹窗 ----
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCase, setNewCase] = useState({
    category: '核心流程', title: '', preconditions: '', steps: '', expected: '',
  })
  // ---- F23: 删除确认 ----
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, title }
  // ---- 分页 ----
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 本地副本，用于编辑同步
  const [localCases, setLocalCases] = useState([])

  useEffect(() => {
    if (testCases) setLocalCases(testCases)
  }, [testCases])

  // 同步到父组件
  const syncUp = useCallback((updated) => {
    setLocalCases(updated)
    onChange?.(updated)
  }, [onChange])

  // ---- F21: 开始编辑 ----
  const startEdit = useCallback((id, field, currentValue) => {
    if (!EDITABLE_COLS.includes(field)) return
    setEditingCell({ id, field })
    setEditValue(currentValue)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }, [])

  // ---- F21: 保存编辑 ----
  const saveEdit = useCallback(async () => {
    if (!editingCell) return
    const field = editingCell.field
    const updatedCases = localCases.map((tc) =>
      tc.id === editingCell.id ? { ...tc, [field]: editValue } : tc
    )
    syncUp(updatedCases)
    setEditingCell(null)
    setEditValue('')

    // 持久化到服务端
    if (projectId && editingCell.id > 0) {
      try {
        await updateTestCase(editingCell.id, { [field]: editValue })
      } catch (err) {
        console.error('保存用例失败:', err)
      }
    }
  }, [editingCell, editValue, localCases, syncUp, projectId])

  // ---- F21: 取消编辑 ----
  const cancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
  }, [])

  // ---- F21: 键盘处理 ----
  const handleEditKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }, [saveEdit, cancelEdit])

  // ---- F22: 新增用例 ----
  const handleAdd = useCallback(async () => {
    if (!newCase.title.trim()) return

    if (projectId) {
      try {
        const created = await createTestCase(projectId, {
          category: newCase.category,
          priority: 'P2',
          title: newCase.title.trim(),
          preconditions: newCase.preconditions,
          steps: newCase.steps,
          expected: newCase.expected,
        })
        syncUp([...localCases, created])
      } catch (err) {
        console.error('创建用例失败:', err)
      }
    } else {
      const maxId = localCases.reduce((max, tc) => Math.max(max, tc.id), 0)
      syncUp([...localCases, { ...newCase, id: maxId + 1, priority: 'P2', status: 'draft' }])
    }

    setShowAddModal(false)
    setNewCase({ category: '核心流程', title: '', preconditions: '', steps: '', expected: '' })
  }, [newCase, localCases, syncUp, projectId])

  // ---- F23: 删除用例 ----
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const updated = localCases.filter((tc) => tc.id !== deleteTarget.id)
    syncUp(updated)
    setDeleteTarget(null)

    if (projectId && deleteTarget.id > 0) {
      try {
        await deleteTestCase(deleteTarget.id)
      } catch (err) {
        console.error('删除用例失败:', err)
      }
    }
  }, [deleteTarget, localCases, syncUp, projectId])

  // ---- 筛选逻辑 ----
  const filtered = useMemo(() => {
    if (!localCases) return []
    if (activeCategory === '全部') return localCases
    return localCases.filter((tc) => tc.category === activeCategory)
  }, [localCases, activeCategory])

  const counts = useMemo(() => {
    if (!localCases) return {}
    const c = { '全部': localCases.length }
    localCases.forEach((tc) => {
      c[tc.category] = (c[tc.category] || 0) + 1
    })
    return c
  }, [localCases])

  // ---- 分页计算 ----
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  // 切换分类/数据变更时重置页码
  const prevFilteredLenRef = useRef(filtered.length)
  useEffect(() => {
    if (filtered.length !== prevFilteredLenRef.current) {
      setCurrentPage(1)
      prevFilteredLenRef.current = filtered.length
    }
  }, [filtered.length])

  // 当前页安全钳：页数变少时自动回退
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // ---- 渲染单元格 ----
  const renderCell = (tc, field) => {
    const isEditing = editingCell?.id === tc.id && editingCell?.field === field
    if (isEditing) {
      const isMultiline = field === 'steps' || field === 'expected' || field === 'preconditions'
      const Tag = isMultiline ? 'textarea' : 'input'
      return (
        <Tag
          ref={editInputRef}
          className={isMultiline ? styles.editTextarea : styles.editInput}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={saveEdit}
          rows={isMultiline ? 3 : 1}
        />
      )
    }
    const value = field === 'preconditions' ? (tc[field] || '—') : tc[field]
    return (
      <span
        className={styles.cellContent}
        onDoubleClick={() => startEdit(tc.id, field, tc[field] || '')}
        title="双击编辑"
      >
        {value}
      </span>
    )
  }

  const isEmpty = !localCases || localCases.length === 0

  return (
    <div className={styles.card}>
      {/* 标题栏 */}
      <div className={styles.heading}>
        <ClipboardList size={20} color="#7e57c2" />
        <h2 className={styles.title}>测试用例</h2>
        <span className={styles.totalBadge}>{localCases?.length || 0} 条</span>
        {/* ---- F22: 添加按钮 ---- */}
        <button className={styles.addBtn} onClick={() => setShowAddModal(true)} title="添加用例">
          <Plus size={14} />
          添加
        </button>
      </div>

      {isEmpty ? (
        <div className={styles.empty}>暂无测试用例数据</div>
      ) : (
        <>
          {/* 分类筛选 Tab */}
          <div className={styles.tabs}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`${styles.tab} ${activeCategory === cat.key ? styles.tabActive : ''}`}
                style={{ '--tab-color': cat.color, '--tab-bg': cat.color + '18' }}
                onClick={() => { setActiveCategory(cat.key); setCurrentPage(1) }}
              >
                <Filter size={13} />
                {cat.label}
                {counts[cat.key] > 0 && <span className={styles.tabCount}>{counts[cat.key]}</span>}
              </button>
            ))}
          </div>

          {/* 表格 */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colId}>#</th>
                  <th className={styles.colCategory}>分类</th>
                  <th className={styles.colTitle}>测试标题</th>
                  <th className={styles.colPre}>前置条件</th>
                  <th className={styles.colSteps}>测试步骤</th>
                  <th className={styles.colExpected}>预期结果</th>
                  {/* ---- F23: 操作列 ---- */}
                  <th className={styles.colAction}></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((tc) => (
                  <tr key={tc.id}>
                    <td className={styles.colId}>{tc.id}</td>
                    <td className={styles.colCategory}>
                      <span
                        className={styles.categoryBadge}
                        style={{
                          background: getCategoryColor(tc.category) + '18',
                          color: getCategoryColor(tc.category),
                        }}
                      >
                        {tc.category}
                      </span>
                    </td>
                    <td className={styles.colTitle}>{renderCell(tc, 'title')}</td>
                    <td className={styles.colPre}>{renderCell(tc, 'preconditions')}</td>
                    <td className={styles.colSteps}>{renderCell(tc, 'steps')}</td>
                    <td className={styles.colExpected}>{renderCell(tc, 'expected')}</td>
                    {/* ---- F23: 删除按钮 ---- */}
                    <td className={styles.colAction}>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => setDeleteTarget({ id: tc.id, title: tc.title })}
                        title="删除此用例"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className={styles.noResult}>该分类下暂无测试用例</div>
            )}
          </div>

          {/* ---- 分页控件 ---- */}
          {filtered.length > 0 && (
            <div className={styles.pagination}>
              <div className={styles.pageInfo}>
                第 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} 条，共 {filtered.length} 条
              </div>
              <div className={styles.pageControls}>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                {renderPageNumbers(currentPage, totalPages, setCurrentPage, styles)}
                <button
                  className={styles.pageBtn}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <select
                className={styles.pageSizeSelect}
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} 条/页</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {/* ---- F22: 新增用例弹窗 ---- */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>添加测试用例</h3>
              <button className={styles.modalClose} onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.fieldLabel}>
                分类
                <select
                  className={styles.fieldSelect}
                  value={newCase.category}
                  onChange={(e) => setNewCase({ ...newCase, category: e.target.value })}
                >
                  {CATEGORIES.filter((c) => c.key !== '全部').map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className={styles.fieldLabel}>
                测试标题 <span className={styles.required}>*</span>
                <input
                  className={styles.fieldInput}
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  placeholder="输入测试标题..."
                />
              </label>
              <label className={styles.fieldLabel}>
                前置条件
                <textarea
                  className={styles.fieldTextarea}
                  rows={2}
                  value={newCase.preconditions}
                  onChange={(e) => setNewCase({ ...newCase, preconditions: e.target.value })}
                  placeholder="1. 条件一&#10;2. 条件二"
                />
              </label>
              <label className={styles.fieldLabel}>
                测试步骤
                <textarea
                  className={styles.fieldTextarea}
                  rows={3}
                  value={newCase.steps}
                  onChange={(e) => setNewCase({ ...newCase, steps: e.target.value })}
                  placeholder="1. 步骤一&#10;2. 步骤二"
                />
              </label>
              <label className={styles.fieldLabel}>
                预期结果
                <textarea
                  className={styles.fieldTextarea}
                  rows={3}
                  value={newCase.expected}
                  onChange={(e) => setNewCase({ ...newCase, expected: e.target.value })}
                  placeholder="1. 预期一&#10;2. 预期二"
                />
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalCancel} onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button
                className={styles.modalSubmit}
                onClick={handleAdd}
                disabled={!newCase.title.trim()}
              >
                添加用例
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- F23: 删除确认弹窗 ---- */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <p className={styles.confirmText}>
              确定删除第 <strong>{deleteTarget.id}</strong> 条用例？
            </p>
            <p className={styles.confirmSub}>「{deleteTarget.title}」</p>
            <div className={styles.confirmActions}>
              <button className={styles.modalCancel} onClick={() => setDeleteTarget(null)}>
                取消
              </button>
              <button className={styles.confirmDelete} onClick={confirmDelete}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getCategoryColor(category) {
  const cat = CATEGORIES.find((c) => c.key === category)
  return cat ? cat.color : '#7e57c2'
}

/** 生成页码按钮（含省略号） */
function renderPageNumbers(current, total, setPage, styles) {
  const buttons = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      buttons.push(
        <button
          key={i}
          className={`${styles.pageNum} ${i === current ? styles.pageNumActive : ''}`}
          onClick={() => setPage(i)}
        >{i}</button>
      )
    }
    return buttons
  }

  // 始终显示第1页
  buttons.push(
    <button key={1} className={`${styles.pageNum} ${1 === current ? styles.pageNumActive : ''}`} onClick={() => setPage(1)}>1</button>
  )

  let start = Math.max(2, current - 1)
  let end = Math.min(total - 1, current + 1)
  if (current <= 3) end = Math.min(5, total - 1)
  if (current >= total - 2) start = Math.max(total - 4, 2)

  if (start > 2) buttons.push(<span key="ell1" className={styles.pageEllipsis}>…</span>)

  for (let i = start; i <= end; i++) {
    buttons.push(
      <button key={i} className={`${styles.pageNum} ${i === current ? styles.pageNumActive : ''}`} onClick={() => setPage(i)}>{i}</button>
    )
  }

  if (end < total - 1) buttons.push(<span key="ell2" className={styles.pageEllipsis}>…</span>)

  buttons.push(
    <button key={total} className={`${styles.pageNum} ${total === current ? styles.pageNumActive : ''}`} onClick={() => setPage(total)}>{total}</button>
  )

  return buttons
}
