import { Component } from 'react'

/**
 * ErrorBoundary — 捕获子组件树中的 JavaScript 错误，
 * 防止整个应用白屏崩溃。
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] 捕获到组件错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            maxWidth: 600,
            margin: '0 auto',
          }}
        >
          <h2 style={{ color: '#5e35b1', marginBottom: 16 }}>
            页面出现了意外错误
          </h2>
          <p
            style={{
              color: '#6b6b6b',
              fontSize: 14,
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            请尝试刷新页面。如果问题持续存在，请联系开发团队。
          </p>
          <pre
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              padding: '12px 16px',
              fontSize: 12,
              color: '#ef5350',
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: 200,
            }}
          >
            {this.state.error?.message || '未知错误'}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            style={{
              marginTop: 24,
              padding: '10px 28px',
              background: '#7e57c2',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            刷新页面
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
