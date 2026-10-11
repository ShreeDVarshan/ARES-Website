import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

// Sanitize client error messages to avoid accidental leakage of tokens or secrets
function sanitizeErrorMessage(message: string): string {
  if (!message) return 'An unexpected error occurred in the client application.'
  return message
    .replace(/ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
    .replace(/(password|secret|key|token)["']?\s*[:=]\s*["']?[^"'\s]+/gi, '$1: [REDACTED]')
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught error:', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleClearCacheAndReload = () => {
    localStorage.clear()
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      const sanitized = sanitizeErrorMessage(this.state.error.message)
      return (
        <div style={{
          minHeight: '100vh', background: '#040c08', color: '#e8f5ee',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: 32, fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h1 style={{ color: '#00d084', fontSize: 28, fontWeight: 900, marginBottom: 8 }}>ARES</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 20, textAlign: 'center' }}>
            An unexpected client error occurred. Your data has not been lost.
          </p>
          <div style={{
            background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)',
            borderRadius: 12, padding: 16, fontSize: 13, maxWidth: 600, width: '100%',
            color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: 24
          }}>
            {sanitized}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                background: '#00d084', color: '#040c08', border: 'none',
                borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700,
                cursor: 'pointer'
              }}>
              Try to Recover
            </button>
            <button
              onClick={this.handleReload}
              style={{
                background: 'rgba(255,255,255,0.08)', color: '#e8f5ee', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer'
              }}>
              Reload Page
            </button>
            <button
              onClick={this.handleClearCacheAndReload}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 500,
                cursor: 'pointer'
              }}>
              Clear Session & Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>
)
