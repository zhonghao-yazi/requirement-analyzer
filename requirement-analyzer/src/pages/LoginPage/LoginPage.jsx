import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSearch } from 'lucide-react'
import { login, register } from '../../services/authService'
import { useAuth } from '../../contexts/AuthContext'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const navigate = useNavigate()
  const { loginSuccess } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = isRegister
        ? await register(username, email, password)
        : await login(username, password)

      loginSuccess(result)
      navigate('/projects', { replace: true })
    } catch (err) {
      setError(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <FileSearch size={48} color="#7e57c2" />
          <h1>测试管理系统</h1>
          <p>需求分析 · 用例管理 · 执行追踪</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <h2>{isRegister ? '注册' : '登录'}</h2>

          {error && <div className={styles.error}>{error}</div>}

          <label className={styles.field}>
            <span>用户名</span>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名" required autoFocus />
          </label>

          {isRegister && (
            <label className={styles.field}>
              <span>邮箱</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱" required />
            </label>
          )}

          <label className={styles.field}>
            <span>密码</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）" required minLength={6} />
          </label>

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>

          <p className={styles.switch}>
            {isRegister ? '已有账号？' : '没有账号？'}
            <button type="button" className={styles.switchBtn}
              onClick={() => { setIsRegister(!isRegister); setError('') }}>
              {isRegister ? '去登录' : '去注册'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
