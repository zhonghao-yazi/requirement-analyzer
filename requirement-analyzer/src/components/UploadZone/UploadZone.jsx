import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { FILE_TYPES, ALL_EXTENSIONS } from '../../utils/constants'
import styles from './UploadZone.module.css'

/**
 * 验证文件是否受支持
 * @returns {string|null} 错误信息，null 表示通过
 */
function validateFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  const isValidExt = ALL_EXTENSIONS.includes(ext)

  // 对图片类型做 MIME 兜底检查
  const isImage = file.type.startsWith('image/')
  if (!isValidExt && !isImage) {
    return `不支持的文件格式 "${ext}"`
  }

  // 文件大小校验：最大 50MB
  const MAX_SIZE = 50 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    return `文件过大（${sizeMB}MB），请上传小于 50MB 的文件`
  }

  return null
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export default function UploadZone({ onFileSelect, disabled }) {
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = useCallback(
    (file) => {
      const err = validateFile(file)
      if (err) {
        setError(err)
        setSelectedFile(null)
        onFileSelect?.(null)
        return
      }
      setError(null)
      setSelectedFile(file)
      onFileSelect?.(file)
    },
    [onFileSelect],
  )

  // 拖拽事件
  const handleDragOver = (e) => {
    e.preventDefault()
    if (!disabled) setDragging(true)
  }
  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragging(false)
  }
  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // 点击选择
  const handleClick = () => {
    if (!disabled) inputRef.current?.click()
  }
  const handleChange = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
    // 重置 input 以允许重复选择同名文件
    e.target.value = ''
  }

  // 清除已选文件
  const handleClear = () => {
    setSelectedFile(null)
    setError(null)
    onFileSelect?.(null)
  }

  return (
    <div className={styles.wrapper}>
      {/* 隐藏的 input */}
      <input
        ref={inputRef}
        type="file"
        accept={FILE_TYPES.map((t) => t.mime).join(',')}
        onChange={handleChange}
        className={styles.hiddenInput}
      />

      {/* 拖拽区域 */}
      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${
          disabled ? styles.disabled : ''
        } ${error ? styles.hasError : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {selectedFile ? (
          /* 已选文件信息 */
          <div className={styles.fileInfo}>
            <FileText size={40} color="#7e57c2" />
            <div className={styles.fileMeta}>
              <span className={styles.fileName}>{selectedFile.name}</span>
              <span className={styles.fileSize}>
                {formatSize(selectedFile.size)}
              </span>
            </div>
            <button
              className={styles.clearBtn}
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              title="移除文件"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          /* 默认上传提示 */
          <div className={styles.placeholder}>
            <Upload size={44} color="#b39ddb" />
            <p className={styles.primaryText}>
              拖拽文件到此处，或<span className={styles.link}>点击选择</span>
            </p>
            <p className={styles.secondaryText}>
              支持 PNG / JPG / GIF / DOCX / PDF / MD / TXT / XMind
            </p>
          </div>
        )}
      </div>

      {/* 支持的格式标签 */}
      <div className={styles.formatTags}>
        {FILE_TYPES.map((type) => (
          <span
            key={type.category}
            className={styles.tag}
            style={{ borderColor: type.color, color: type.color }}
          >
            {type.category}
          </span>
        ))}
      </div>

      {/* 错误信息 */}
      {error && (
        <div className={styles.error}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
