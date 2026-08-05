import { Lightbulb, CheckCircle2 } from 'lucide-react'
import styles from './AnalysisResult.module.css'

export default function AnalysisResult({ summary }) {
  if (!summary || summary.length === 0) {
    return (
      <div className={styles.empty}>
        <p>暂无需求摘要</p>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.heading}>
        <Lightbulb size={20} color="#ffa726" />
        <h2 className={styles.title}>需求摘要</h2>
        <span className={styles.badge}>{summary.length} 条要点</span>
      </div>

      <ul className={styles.list}>
        {summary.map((item, i) => (
          <li key={i} className={styles.item}>
            <CheckCircle2 size={16} className={styles.icon} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
