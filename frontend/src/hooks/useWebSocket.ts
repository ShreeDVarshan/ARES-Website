import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/auth'
import { useWSStore } from '../store/ws'

export function useWebSocket() {
  const { user, accessToken } = useAuthStore()
  const { setConnected, setMessage } = useWSStore()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    if (!user || !accessToken) return
    const base = (import.meta.env.VITE_WS_URL || '').replace(/^http/, 'ws') ||
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
    const url = `${base}/ws/${user.factory_id}?token=${accessToken}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      reconnectRef.current = setTimeout(connect, 5000)
    }
    ws.onerror = () => ws.close()
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        setMessage(msg)
      } catch { /* ignore */ }
    }

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping')
    }, 30_000)

    return () => {
      clearInterval(ping)
      ws.close()
    }
  }, [user, accessToken, setConnected, setMessage])

  useEffect(() => {
    const cleanup = connect()
    return () => {
      cleanup?.()
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  // Pause when tab hidden
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        wsRef.current?.close()
      } else {
        connect()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [connect])
}
