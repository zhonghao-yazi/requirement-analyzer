import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import UploadZone from '../../components/UploadZone/UploadZone'
import AnalysisResult from '../../components/AnalysisResult/AnalysisResult'
import TestCaseTable from '../../components/TestCaseTable/TestCaseTable'
import DownloadBar from '../../components/DownloadBar/DownloadBar'
import { analyzeFile } from '../../services/testcaseService'
import { listTestCases, createTestCase, updateTestCase, deleteTestCase } from '../../services/testcaseService'
import { getProject } from '../../services/projectService'
import styles from './AnalysisPage.module.css'

export default function AnalysisPage() {
  const { projectId } = useParams()
  const pid = parseInt(projectId, 10)
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [testCases, setTestCases] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  const requestSeqRef = useRef(0)
  const fileRef = useRef(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [p, tcData] = await Promise.all([getProject(pid), listTestCases(pid)])
        setProject(p)
        setTestCases(tcData.data || [])
      } catch (err) { setError(err.message) }
      finally { setDataLoading(false) }
    }
    loadData()
  }, [pid])

  const handleFileSelect = useCallback(async (f) => {
    setFile(f)
    setError(null)
    if (!f) { setAnalysisResult(null); setLoading(false); fileRef.current = null; requestSeqRef.current++; return }
    fileRef.current = { name: f.name, size: formatSize(f.size) }
    setAnalysisResult(null)
    setLoading(true)
    const currentSeq = ++requestSeqRef.current
    try {
      const result = await analyzeFile(pid, f)
      if (currentSeq === requestSeqRef.current) {
        setAnalysisResult(result)
        setLoading(false)
        const tcData = await listTestCases(pid)
        setTestCases(tcData.data || [])
      }
    } catch (err) {
      if (currentSeq === requestSeqRef.current) {
        setError(err.message || '分析失败，请重试')
        setLoading(false)
      }
    }
  }, [pid])

  const handleUpdateTestCases = useCallback((updatedCases) => { setTestCases(updatedCases) }, [])

  if (dataLoading) return (<div className={styles.loadingPage}><div className="loading-spinner" /></div>)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/projects')}>
          <ArrowLeft size={20} /> 返回项目列表
        </button>
        <h1 className={styles.projectName}>{project?.name || '加载中...'}</h1>
        <span className={styles.caseCount}>{testCases.length} 条用例</span>
      </header>
      <main className={styles.main}>
        <section className={styles.section}>
          <UploadZone onFileSelect={handleFileSelect} disabled={loading} />
        </section>
        {error && (<section className={styles.section}><div className={styles.errorBanner}>{error}</div></section>)}
        {loading && (<section className={`${styles.section} ${styles.center}`}>
          <div className="loading-spinner" /><p className={styles.loadingText}>正在解析文件，AI 分析需求内容...</p>
        </section>)}
        {analysisResult && !loading && (
          <div className={styles.resultsArea}>
            <AnalysisResult summary={analysisResult.summary} />
            <TestCaseTable testCases={testCases} onChange={handleUpdateTestCases} projectId={pid} />
            <DownloadBar testCases={testCases} />
          </div>
        )}
        {!file && !loading && testCases.length === 0 && (
          <div className={styles.resultsArea}>
            <TestCaseTable testCases={testCases} onChange={handleUpdateTestCases} projectId={pid} />
          </div>
        )}
        {!file && !loading && testCases.length > 0 && !analysisResult && (
          <div className={styles.resultsArea}>
            <TestCaseTable testCases={testCases} onChange={handleUpdateTestCases} projectId={pid} />
            <DownloadBar testCases={testCases} />
          </div>
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
