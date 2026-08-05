import { useState, useEffect, useCallback } from 'react'
import { History, Trash2, X, Clock, FileText } from 'lucide-react'
import { getHistory, deleteHistory, clearHistory } from '../../services/historyService'
import styles from './HistoryPanel.module.css'

export default function HistoryPanel({ onSelect }) {
  const [history, setHistory] = useState([])
  const [open, setOpen] = useState(false)

  const refresh = useCallback(() => setHistory(getHistory()), [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // 监听其他标签页的 storage 变化
  useEffect(() => {
    const handler = () => refresh()
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [refresh])

  const handleDelete = (id) => {
    deleteHistory(id)
    refresh()
  }

  const handleClearAll = () => {
    clearHistory()
    refresh()
  }

  const handleSelect = (entry) => {
    onSelect?.(entry.data)
    setOpen(false)
  }

  return (
    <div className={styles.container}>
      {/* 触发按钮 */}
      <button
        className={styles.trigger}
        onClick={() => { setOpen(!open); if (!open) refresh() }}
        title="分析历史记录"
      >
        <Clock size={16} />
        <span>历史记录</span>
        {history.length > 0 && (
          <span className={styles.badge}>{history.length}</span>
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <History size={16} color="#7e57c2" />
              <h3>分析历史</h3>
              <span className={styles.count}>{history.length}/{10}</span>
              {history.length > 0 && (
                <button className={styles.clearAll} onClick={handleClearAll}>
                  清空
                </button>
              )}
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.list}>
              {history.length === 0 ? (
                <div className={styles.empty}>
                  <FileText size={32} color="#b39ddb" />
                  <p>暂无分析记录</p>
                  <p className={styles.emptyHint}>上传文件完成分析后，结果将自动保存</p>
                </div>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className={styles.item}
                    onClick={() => handleSelect(entry)}
                  >
                    <div className={styles.itemIcon}>
                      <FileText size={18} color="#7e57c2" />
                    </div>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{entry.fileName}</span>
                      <span className={styles.itemMeta}>
                        {entry.label} · {entry.fileSize} · {entry.data.testCases?.length || 0} 条用例
                      </span>
                    </div>
                    <button
                      className={styles.itemDelete}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(entry.id)
                      }}
                      title="删除此记录"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
