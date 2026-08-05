import { Download, Copy, Check, Loader2 } from 'lucide-react'
import { useState, useCallback } from 'react'
import { exportToExcel } from '../../utils/excelExport'
import styles from './DownloadBar.module.css'

export default function DownloadBar({ testCases }) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    if (!testCases || testCases.length === 0) return
    setDownloading(true)
    try {
      await exportToExcel(testCases)
    } catch (err) {
      console.error('导出失败:', err)
    } finally {
      setDownloading(false)
    }
  }, [testCases])

  const handleCopy = useCallback(async () => {
    if (!testCases || testCases.length === 0) return

    // 构建 TSV 格式文本（表格粘贴友好）
    const header = '序号\t分类\t测试标题\t前置条件\t测试步骤\t预期结果'
    const rows = testCases.map(
      (tc) =>
        `${tc.id}\t${tc.category}\t${tc.title}\t${tc.preconditions || ''}\t${tc.steps || ''}\t${tc.expected || ''}`,
    )
    const text = [header, ...rows].join('\n')

    let copySuccess = false

    try {
      await navigator.clipboard.writeText(text)
      copySuccess = true
    } catch {
      // 降级：使用 ClipboardItem API（支持非安全上下文）
      try {
        const blob = new Blob([text], { type: 'text/plain' })
        const item = new ClipboardItem({ 'text/plain': blob })
        await navigator.clipboard.write([item])
        copySuccess = true
      } catch {
        // 最终降级：传统的 textarea + execCommand 方式
        try {
          const textarea = document.createElement('textarea')
          textarea.value = text
          textarea.style.position = 'fixed'
          textarea.style.left = '-9999px'
          textarea.style.top = '-9999px'
          document.body.appendChild(textarea)
          textarea.select()
          textarea.setSelectionRange(0, text.length)
          document.execCommand('copy')
          document.body.removeChild(textarea)
          copySuccess = true
        } catch {
          // 所有方式都失败
        }
      }
    }

    if (copySuccess) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [testCases])

  if (!testCases || testCases.length === 0) return null

  return (
    <div className={styles.bar}>
      <div className={styles.info}>
        共 <strong>{testCases.length}</strong> 条测试用例
      </div>
      <div className={styles.actions}>
        <button className={styles.btnCopy} onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? '已复制' : '复制表格'}
        </button>
        <button className={styles.btnDownload} onClick={handleDownload} disabled={downloading}>
          {downloading ? <Loader2 size={16} className={styles.spin} /> : <Download size={16} />}
          {downloading ? '生成中...' : '下载 Excel'}
        </button>
      </div>
    </div>
  )
}
