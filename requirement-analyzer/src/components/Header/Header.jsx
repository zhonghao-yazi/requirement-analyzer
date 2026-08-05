import { FileSearch } from 'lucide-react'
import styles from './Header.module.css'

export default function Header({ children }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <FileSearch size={32} color="#7e57c2" />
          <div>
            <h1 className={styles.title}>需求分析 · 测试用例生成平台</h1>
            <p className={styles.subtitle}>
              上传需求文件，智能分析，一键生成完整测试用例
            </p>
          </div>
        </div>
        {children && <div className={styles.actions}>{children}</div>}
      </div>
    </header>
  )
}
