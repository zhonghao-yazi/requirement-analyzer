import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Trash2, LogOut, FileSearch } from 'lucide-react'
import { listProjects, createProject, deleteProject } from '../../services/projectService'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ProjectsPage.module.css'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const fetchProjects = useCallback(async () => {
    try {
      const data = await listProjects()
      setProjects(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      const p = await createProject(name.trim(), desc.trim() || null)
      setProjects((prev) => [p, ...prev])
      setShowCreate(false)
      setName('')
      setDesc('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id, projectName) => {
    if (!window.confirm(`确定删除项目「${projectName}」？\n此操作将同时删除该项目下的所有需求、用例和执行记录。`)) return
    try {
      await deleteProject(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand} onClick={() => navigate('/projects')}>
          <FileSearch size={28} color="#7e57c2" />
          <h1>测试管理系统</h1>
        </div>
        <div className={styles.userArea}>
          <span className={styles.userName}>{user?.username}</span>
          <button className={styles.logoutBtn} onClick={logout} title="退出登录">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <h2>我的项目</h2>
          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
            <Plus size={18} /> 创建项目
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {showCreate && (
          <form className={styles.createForm} onSubmit={handleCreate}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="项目名称（必填）" required autoFocus className={styles.createInput} />
            <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="项目描述（可选）" className={styles.createInput} />
            <div className={styles.createActions}>
              <button type="submit" disabled={creating || !name.trim()} className={styles.submitBtn}>
                {creating ? '创建中...' : '确认创建'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className={styles.cancelBtn}>取消</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className={styles.loading}><div className="loading-spinner" /></div>
        ) : projects.length === 0 ? (
          <div className={styles.empty}>
            <FolderOpen size={64} color="#ccc" />
            <p>还没有项目，点击上方按钮创建第一个</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {projects.map((p) => (
              <div key={p.id} className={styles.card} onClick={() => navigate(`/projects/${p.id}`)}>
                <div className={styles.cardHeader}>
                  <h3>{p.name}</h3>
                  <button className={styles.deleteBtn}
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name) }}
                    title="删除项目">
                    <Trash2 size={16} />
                  </button>
                </div>
                {p.description && <p className={styles.cardDesc}>{p.description}</p>}
                <div className={styles.cardMeta}>
                  <span>{p.testcase_count} 条用例</span>
                  <span>{p.created_at?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
