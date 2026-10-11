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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error
      return (
        <div style={{
          minHeight: '100vh', background: '#040c08', color: '#e8f5ee',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: 32, fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h1 style={{ color: '#00d084', fontSize: 28, fontWeight: 900, marginBottom: 8 }}>ARES</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
            Application error — please refresh
          </p>
          <pre style={{
            background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)',
            borderRadius: 12, padding: 16, fontSize: 12, maxWidth: 600,
            color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
          }}>
            {err.message}{'\n'}{err.stack?.split('\n').slice(0, 5).join('\n')}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.reload() }}
            style={{
              marginTop: 20, background: '#00d084', color: 'black', border: 'none',
              borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer'
            }}>
            Clear cache & reload
          </button>
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
