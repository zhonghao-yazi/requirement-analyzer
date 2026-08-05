import { useState, useCallback, useRef } from 'react'
import Header from './components/Header/Header'
import UploadZone from './components/UploadZone/UploadZone'
import AnalysisResult from './components/AnalysisResult/AnalysisResult'

import TestCaseTable from './components/TestCaseTable/TestCaseTable'
import DownloadBar from './components/DownloadBar/DownloadBar'
import HistoryPanel from './components/HistoryPanel/HistoryPanel'
import { analyzeRequirement } from './services/aiService'
import { saveHistory } from './services/historyService'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const requestSeqRef = useRef(0)
  // F24: 当前分析对应的文件名/大小，用于保存历史
  const fileRef = useRef(null)

  const handleFileSelect = useCallback(async (f) => {
    setFile(f)
    setError(null)

    if (!f) {
      setAnalysisResult(null)
      setLoading(false)
      fileRef.current = null
      requestSeqRef.current++
      return
    }

    fileRef.current = { name: f.name, size: formatSize(f.size) }
    setAnalysisResult(null)
    setLoading(true)

    const currentSeq = ++requestSeqRef.current

    try {
      const result = await analyzeRequirement(f)
      if (currentSeq === requestSeqRef.current) {
        setAnalysisResult(result)
        setLoading(false)
        // F24: 保存到历史记录
        if (fileRef.current) {
          saveHistory(fileRef.current.name, fileRef.current.size, result)
        }
      }
    } catch (err) {
      if (currentSeq === requestSeqRef.current) {
        setError(err.message || '分析失败，请重试')
        setLoading(false)
      }
    }
  }, [])

  // F21-F23: 测试用例变更同步（编辑/新增/删除）
  const handleUpdateTestCases = useCallback((updatedCases) => {
    setAnalysisResult((prev) => prev ? { ...prev, testCases: updatedCases } : null)
  }, [])

  // F24: 从历史记录恢复
  const handleHistorySelect = useCallback((data) => {
    setFile(null)
    setError(null)
    setAnalysisResult(data)
    fileRef.current = null
  }, [])

  return (
    <div className="app">
      <Header>
        <HistoryPanel onSelect={handleHistorySelect} />
      </Header>
      <main className="main">
        <section className="section">
          <UploadZone onFileSelect={handleFileSelect} disabled={loading} />
        </section>

        {error && (
          <section className="section">
            <div className="error-banner">{error}</div>
          </section>
        )}

        {loading && (
          <section className="section center">
            <div className="loading-spinner" />
            <p className="loading-text">正在解析文件，AI 分析需求内容...</p>
          </section>
        )}

        {analysisResult && !loading && (
          <div className="results-area">
            <AnalysisResult summary={analysisResult.summary} />

            <TestCaseTable
              testCases={analysisResult.testCases}
              onChange={handleUpdateTestCases}
            />
            <DownloadBar testCases={analysisResult.testCases} />
          </div>
        )}

        {!file && !loading && (
          <section className="section center empty-state">
            <p className="empty-hint">
              上传需求文件，AI 将自动分析并生成测试用例
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export default App
